import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Device-side queue of unsynced mutations (§4.12 / D58). EVERY local write
 * applies here FIRST, queues an op, then pushes FIFO. The uuid doubles as
 * the server idempotency key (household_changes.client_op_uuid).
 */
export const pendingOps = sqliteTable('pending_ops', {
  uuid: text('uuid').primaryKey(),
  householdId: text('household_id').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  op: text('op', { enum: ['create', 'update', 'delete'] }).notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  audienceType: text('audience_type', { enum: ['members', 'roles', 'all'] }).notNull(),
  audienceIds: text('audience_ids', { mode: 'json' }).$type<string[]>().notNull(),
  domain: text('domain').notNull(),
  createdAt: text('created_at').notNull(),
});

/** Sync bookkeeping on the device side (§4.12): cursor + freshness. */
export const deviceSyncState = sqliteTable('device_sync_state', {
  id: text('id').primaryKey(), // singleton row 'local'
  cursor: text('cursor').notNull().default('0'),
  lastSuccessfulSyncAt: text('last_successful_sync_at'),
  bootstrapAt: text('bootstrap_at'),
  /** D90: highest feed seq we pushed, per entityId — cross-flush loss window. */
  pushedSeqs: text('pushed_seqs', { mode: 'json' }).$type<Record<string, number>>(),
});

export type PendingOp = typeof pendingOps.$inferSelect;
export type NewPendingOp = typeof pendingOps.$inferInsert;
export type DeviceSyncState = typeof deviceSyncState.$inferSelect;
