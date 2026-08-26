import { eq } from 'drizzle-orm';
import type { DeviceDatabase } from '../client';
import { deviceSyncState } from '../schema';
import { notifications as notificationsTable, pendingOps } from '../schema';
import { PendingOpQueue } from '../queue';
import {
  ENTITY_TABLES,
  applyChange,
  findOverwritten,
  recordOverwrittenNotification,
} from './apply';
import type { SyncTransport, SyncOpWire } from './transport';

const PUSH_BATCH = 100;
const PULL_PAGE = 500;
const FLUSH_DEBOUNCE_MS = 500;
const TICK_MS = 30_000;

export interface SyncIdentity {
  token(): string | null;
  householdCode(): string | null;
  householdId(): string | null;
  myPersonId(): string | null;
}

export interface FlushResult {
  pushed: number;
  rejected: number;
  applied: number;
  skipped: number;
}

/**
 * Device sync orchestrator (§4.12): push FIFO batch → ack-clear → pull since
 * cursor → LWW apply with conflict detection → persist cursor +
 * lastSuccessfulSyncAt. Reentrant-safe: concurrent triggers coalesce.
 */
export class SyncEngine {
  private flushing = false;

  constructor(
    private readonly db: DeviceDatabase,
    private readonly transport: SyncTransport,
    private readonly identity: SyncIdentity,
    private readonly queue = new PendingOpQueue(db),
  ) {}

  async flush(): Promise<FlushResult> {
    const code = this.identity.householdCode();
    const token = this.identity.token();
    if (!code || !token || this.flushing) {
      return { pushed: 0, rejected: 0, applied: 0, skipped: 0 };
    }
    this.flushing = true;
    try {
      const result = await this.flushInner(code, token);
      await this.markSynced();
      return result;
    } finally {
      this.flushing = false;
    }
  }

  private async flushInner(code: string, token: string): Promise<FlushResult> {
    let pushed = 0;
    let rejected = 0;

    // Collision window: entities this device held pending AT FLUSH START.
    // The push phase drains the queue, so capture the set beforehand —
    // a pulled change touching any of these means our write lost the race.
    const prePushPending = new Set(
      (await this.db.select().from(pendingOps)).map((op) => op.entityId),
    );

    // PUSH phase — FIFO batches until drained.
    for (;;) {
      const batch = await this.queue.peekBatch(PUSH_BATCH);
      if (batch.length === 0) break;
      const ops: SyncOpWire[] = batch.map((op) => ({
        uuid: op.uuid,
        entity: op.entity,
        entityId: op.entityId,
        op: op.op,
        payload: op.payload,
        audienceType: op.audienceType,
        audienceIds: op.audienceIds,
        domain: op.domain as SyncOpWire['domain'],
      }));
      const outcomes = await this.transport.push(code, ops, token);

      const acked: string[] = [];
      for (const outcome of outcomes) {
        if (outcome.status === 'rejected') {
          rejected++;
          const source = batch.find((b) => b.uuid === outcome.uuid);
      if (source) await this.recordRejected(source);
        }
        // accepted AND duplicate clear the queue — duplicates prove server receipt.
        acked.push(outcome.uuid);
      }
      await this.queue.removeAcked(acked);
      pushed += acked.filter((u) => outcomes.find((o) => o.uuid === u)?.status === 'accepted').length;
    }

    // PULL phase — page until exhausted.
    const cursorRow = await this.db.select().from(deviceSyncState).limit(1);
    const mePersonId = this.identity.myPersonId();
    let cursor = Number(cursorRow[0]?.cursor ?? 0);
    let applied = 0;
    let skipped = 0;

    for (;;) {
      const page = await this.transport.pull(code, cursor, token, PULL_PAGE);

      const conflicts = findOverwritten(mePersonId, prePushPending, page.changes);
      for (const conflict of conflicts) {
        if (!mePersonId || !this.identity.householdId()) break;
        await recordOverwrittenNotification(this.db, {
          householdId: this.identity.householdId()!,
          recipientPersonId: mePersonId,
          entity: conflict.entity,
          entityId: conflict.entityId,
          actorPersonId: conflict.actorPersonId,
          occurredAt: new Date().toISOString(),
        });
      }

      for (const change of page.changes) {
        const table = ENTITY_TABLES[change.entity];
        if (!table) continue; // unknown entity from a NEWER app version — skip leniently
        try {
          await applyChange(this.db, table, change);
          applied++;
        } catch {
          // A single poison row must never wedge future syncs; the next
          // bootstrap (90-day staleness) is the repair path.
          skipped++;
        }
      }

      cursor = page.cursor;
      if (!page.hasMore) break;
    }

    await this.writeCursor(cursor);
    return { pushed, rejected, applied, skipped };
  }

  /** §4.12 bootstrap: empty device or >90-day staleness ⇒ full resnapshot. */
  async bootstrap(): Promise<number> {
    const code = this.identity.householdCode();
    const token = this.identity.token();
    if (!code || !token) return 0;
    const snapshot = await this.transport.bootstrap(code, token);
    for (const [entity, rows] of Object.entries(snapshot.sections)) {
      const table = ENTITY_TABLES[entity];
      if (!table) continue;
      for (const row of rows) {
        await applyChange(this.db, table, {
          seq: snapshot.cursor,
          actorPersonId: null,
          entity,
          entityId: String(row.id ?? ''),
          op: 'create',
          payload: row,
        });
      }
    }
    await this.writeCursor(snapshot.cursor, true);
    return snapshot.cursor;
  }

  private async recordRejected(op: {
    uuid: string;
    entity: string;
    entityId: string;
  }): Promise<void> {
    const me = this.identity.myPersonId();
    const householdId = this.identity.householdId();
    if (!me || !householdId) return;
    // Permission rejection (D59): no overriding actor — sync is not a bypass.
    await recordOverwrittenNotification(this.db, {
      householdId,
      recipientPersonId: me,
      entity: op.entity,
      entityId: op.entityId,
      actorPersonId: null,
      occurredAt: new Date().toISOString(),
      kind: 'sync.changeRejected',
    });
  }

  private async markSynced(): Promise<void> {
    await this.writeCursor(await this.readCursor());
  }

  private async readCursor(): Promise<number> {
    const rows = await this.db.select().from(deviceSyncState).limit(1);
    return Number(rows[0]?.cursor ?? 0);
  }

  private async writeCursor(cursor: number, isBootstrap = false): Promise<void> {
    const nowIso = new Date().toISOString();
    const existing = await this.db.select().from(deviceSyncState).limit(1);
    if (existing.length === 0) {
      await this.db.insert(deviceSyncState).values({
        id: 'local',
        cursor: String(cursor),
        lastSuccessfulSyncAt: nowIso,
        ...(isBootstrap ? { bootstrapAt: nowIso } : {}),
      });
      return;
    }
    await this.db
      .update(deviceSyncState)
      .set({ cursor: String(cursor), lastSuccessfulSyncAt: nowIso })
      .where(eq(deviceSyncState.id, 'local'));
  }
}
