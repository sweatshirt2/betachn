import { eq } from 'drizzle-orm';
import {
  activityEvents,
  assets,
  assignmentRules,
  households,
  notificationPrefs,
  notifications,
  occurrences,
  people,
  responsibilities,
  roles,
  rooms,
  routines,
  serviceRecords,
  shoppingItems,
  subtasks,
  supplies,
  users,
} from '@chorify/db';
import type { Executor } from '../../db';
import type { PushOp } from './sync.service';

/* eslint-disable @typescript-eslint/no-explicit-any -- generic pg applier keyed by the shared SYNC_ENTITIES registry */
type AnyPgTable = any;

/**
 * SYNC_ENTITIES ↔ pg tables — the server-side twin of the device's
 * ENTITY_TABLES registry. Same names, same row shapes; the feed payload is
 * a full after-state row either way (D76).
 */
export const PG_ENTITY_TABLES: Record<string, AnyPgTable> = {
  households,
  people,
  users,
  roles,
  routines,
  responsibilities,
  subtasks,
  assignment_rules: assignmentRules,
  occurrences,
  rooms,
  assets,
  service_records: serviceRecords,
  supplies,
  shopping_items: shoppingItems,
  activity_events: activityEvents,
  notifications,
  notification_prefs: notificationPrefs,
};

/**
 * D91 push write-through (§4.12): a device-originated change is APPLIED to
 * the authoritative server tables in the same transaction that appends its
 * feed row — otherwise server jobs (/today generation, sweeps, digests) and
 * fresh-device bootstrap would never see device writes.
 *
 * LWW semantics mirror the device applier: delete ⇒ tombstone row removal
 * (later creates may resurrect); create/update ⇒ full-row upsert on `id`.
 * Poison rows (FK/NOT NULL from a buggy client) REJECT the op rather than
 * wedging the batch — the device drops it and notifies per D75/D76.
 */
export async function applyToServerTables(
  exec: Executor,
  op: PushOp,
): Promise<void> {
  const table = PG_ENTITY_TABLES[op.entity];
  if (!table) return; // unknown entity from a NEWER client — feed-only, lenient
  if (op.op === 'delete') {
    await exec.delete(table).where(eqId(table, op.entityId));
    return;
  }
  const row = { ...(op.payload as Record<string, unknown>), id: op.entityId };
  await exec
    .insert(table)
    .values(row)
    .onConflictDoUpdate({ target: table.id, set: stripKeys(row, ['id']) });
}

function eqId(table: AnyPgTable, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return eq(table.id, id);
}

function stripKeys(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!keys.includes(k)) rest[k] = v;
  return rest;
}
