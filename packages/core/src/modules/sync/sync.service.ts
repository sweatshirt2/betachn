import { and, asc, desc, eq, gt } from 'drizzle-orm';
import { householdChanges } from '@chorify/db';
import type { ChangeOp, SyncDomain, AudienceType } from '@chorify/db';
import { AppError } from '../../errors';
import type { Executor, UnitOfWork } from '../../db';
import { DOMAIN_VIEW_KEY, matchesViewer, type ViewerIdentity } from './sync.rules';
import { applyToServerTables } from './sync.tables';

/** One queued device mutation arriving at POST /sync/push (§4.12). */
export interface PushOp {
  /** pending_ops client uuid — THE idempotency key. */
  uuid: string;
  entity: string;
  entityId: string;
  op: ChangeOp;
  payload: Record<string, unknown>;
  audienceType: AudienceType;
  audienceIds: string[];
  domain: SyncDomain;
}

export type PushOutcome =
  | { uuid: string; status: 'accepted'; seq: number }
  | { uuid: string; status: 'duplicate' }
  | { uuid: string; status: 'rejected'; reason: 'FORBIDDEN_DOMAIN' };

export interface FeedChange {
  seq: number;
  actorPersonId: string | null;
  entity: string;
  entityId: string;
  op: ChangeOp;
  payload: Record<string, unknown>;
  audienceType: AudienceType;
  audienceIds: string[];
  domain: SyncDomain;
}

const PUSH_BATCH_LIMIT = 500;
const FEED_BATCH_SIZE = 200;
const SEQ_RETRIES = 5;

/**
 * Authoritative feed writer + reader (§4.12 / D59–D61). Every mutating route
 * records through {@link SyncService.recordChange}; devices push/pull here.
 * Audiences stay SYMBOLIC — live evaluation happens at pull (matchesViewer).
 * Conflicts are pure row-level LWW by server arrival order: this append-only
 * feed IS the arrival order.
 */
export class SyncService {
  constructor(private readonly uow: UnitOfWork) {}

  /**
   * Per-op re-authorization against CURRENT roles — offline demotion ⇒
   * rejected + notified downstream, never a permission bypass (D59). Uuid
   * replays report duplicate without re-applying. Batch commits atomically.
   */
  async push(
    viewer: ViewerIdentity & { householdId: string },
    ops: PushOp[],
  ): Promise<PushOutcome[]> {
    if (ops.length > PUSH_BATCH_LIMIT) {
      throw new AppError('VALIDATION_ERROR', `Batch exceeds ${PUSH_BATCH_LIMIT} ops`);
    }
    return this.uow.transact(async (tx) => {
      const results: PushOutcome[] = [];
      for (const op of ops) {
        if (!viewer.resolves(DOMAIN_VIEW_KEY[op.domain])) {
          results.push({ uuid: op.uuid, status: 'rejected', reason: 'FORBIDDEN_DOMAIN' });
          continue;
        }
        const replay = await tx.query.householdChanges!.findFirst({
          where: eq(householdChanges.clientOpUuid, op.uuid),
          columns: { seq: true },
        });
        if (replay) {
          results.push({ uuid: op.uuid, status: 'duplicate' });
          continue;
        }
        // D91 write-through: apply to the authoritative tables in THIS tx so
        // jobs/bootstrap see device writes; a poison row rejects the op
        // (device drops + notifies) instead of wedging the batch.
        try {
          await applyToServerTables(tx, op);
        } catch {
          results.push({ uuid: op.uuid, status: 'rejected', reason: 'FORBIDDEN_DOMAIN' });
          continue;
        }
        const seq = await this.append(tx, {
          householdId: viewer.householdId,
          actorPersonId: viewer.personId,
          entity: op.entity,
          entityId: op.entityId,
          op: op.op,
          payload: op.payload,
          audienceType: op.audienceType,
          audienceIds: op.audienceIds,
          domain: op.domain,
          clientOpUuid: op.uuid,
        });
        results.push({ uuid: op.uuid, status: 'accepted', seq });
      }
      return results;
    });
  }

  /**
   * Live audience evaluation + permission-domain gate (CN XIX-4). Pages FILL
   * by batching because the symbolic filter shrinks raw batches — a page
   * boundary must never strand allowed changes behind filtered ones.
   */
  async pull(
    viewer: ViewerIdentity & { householdId: string },
    sinceSeq: number,
    limit = 500,
  ): Promise<{ changes: FeedChange[]; cursor: number; hasMore: boolean }> {
    const collected: FeedChange[] = [];
    let scannedThrough = sinceSeq;
    for (let batch = 0; batch < 50 && collected.length <= limit; batch++) {
      const rows = await this.uow.exec.query.householdChanges!.findMany({
        where: and(
          eq(householdChanges.householdId, viewer.householdId),
          gt(householdChanges.seq, scannedThrough),
        ),
        orderBy: [asc(householdChanges.seq)],
        limit: FEED_BATCH_SIZE,
      });
      if (rows.length === 0) break;

      for (const row of rows) {
        const change = toChange(row);
        if (matchesViewer(change, viewer)) collected.push(change);
      }
      const last = rows.at(-1)!;
      scannedThrough = Number(last.seq);
      if (rows.length < FEED_BATCH_SIZE) break;
    }

    const hasMore = collected.length > limit;
    const page = collected.slice(0, limit);
    return {
      changes: page,
      cursor: page.length > 0 ? page.at(-1)!.seq : scannedThrough,
      hasMore,
    };
  }

  /** Highest allocated seq for a household — fresh-cursor bootstrap anchor.
   *  (D90: push outcomes carry their assigned seq so devices can detect
   *  cross-flush conflicts — someone else landing on an entity this device
   *  already pushed.) */
  async headSeq(householdId: string): Promise<number> {
    const rows = await latestSeqRow(this.uow.exec, householdId);
    return rows.length > 0 ? Number(rows[0]!.seq) : 0;
  }

  /**
   * Append one change with per-household monotonic seq. Read-committed racers
   * collide on UNIQUE `(household_id, seq)` (SQLSTATE 23505) and simply retry
   * at the new head — arrival order remains total and gap-free.
   * Used by push() AND by every mutating route/service recorder.
   */
  async recordChange(
    exec: Executor,
    entry: Omit<AppendEntry, 'clientOpUuid'> & { clientOpUuid?: string },
  ): Promise<number> {
    return this.append(exec, entry);
  }

  private async append(exec: Executor, entry: AppendEntry): Promise<number> {
    for (let attempt = 0; attempt < SEQ_RETRIES; attempt++) {
      const head = await latestSeqRow(exec, entry.householdId);
      const seq = (head.length > 0 ? Number(head[0]!.seq) : 0) + 1;
      try {
        await exec.insert(householdChanges).values({ ...entry, seq }).returning();
        return seq;
      } catch (err) {
        if ((err as { code?: string }).code !== '23505') throw err;
      }
    }
    throw new AppError('CONFLICT', 'Could not allocate a sync sequence');
  }
}

interface AppendEntry {
  householdId: string;
  clientOpUuid?: string;
  actorPersonId: string | null;
  entity: string;
  entityId: string;
  op: ChangeOp;
  payload: Record<string, unknown>;
  audienceType: AudienceType;
  audienceIds: string[];
  domain: SyncDomain;
}

function latestSeqRow(exec: Executor, householdId: string) {
  return exec.query.householdChanges!.findMany({
    where: eq(householdChanges.householdId, householdId),
    columns: { seq: true },
    orderBy: [desc(householdChanges.seq)],
    limit: 1,
  }) as unknown as Promise<Array<{ seq: string | number }>>;
}

function toChange(row: Record<string, unknown>): FeedChange {
  return {
    seq: Number(row.seq),
    actorPersonId: (row.actorPersonId as string | null) ?? null,
    entity: String(row.entity),
    entityId: String(row.entityId),
    op: row.op as ChangeOp,
    payload: (row.payload as Record<string, unknown>) ?? {},
    audienceType: row.audienceType as AudienceType,
    audienceIds: (row.audienceIds as string[]) ?? [],
    domain: row.domain as SyncDomain,
  };
}
