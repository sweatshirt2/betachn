import { asc, eq } from 'drizzle-orm';
import { pendingOps as pendingOpsTable, type NewPendingOp, type PendingOp } from './schema';
import type { DeviceDatabase } from './client';

/**
 * FIFO outbox of unsynced device mutations (§4.12 / D58). Ops are DELETED on
 * push ack — the authoritative history lives in the server's household_changes;
 * keeping a device-side copy would double-store every write.
 */
export class PendingOpQueue {
  constructor(private readonly db: DeviceDatabase) {}

  async enqueue(op: NewPendingOp): Promise<void> {
    await this.db.insert(pendingOpsTable).values(op);
  }

  /** Oldest-first batch; uuid doubles as the server idempotency key. */
  async peekBatch(limit = 100): Promise<PendingOp[]> {
    return this.db.select().from(pendingOpsTable).orderBy(asc(pendingOpsTable.createdAt)).limit(limit);
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ uuid: pendingOpsTable.uuid }).from(pendingOpsTable);
    return rows.length;
  }

  async removeAcked(uuids: string[]): Promise<void> {
    if (uuids.length === 0) return;
    for (const uuid of uuids) {
      await this.db.delete(pendingOpsTable).where(eq(pendingOpsTable.uuid, uuid));
    }
  }
}
