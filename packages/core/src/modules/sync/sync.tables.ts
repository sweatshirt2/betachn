import { eq } from 'drizzle-orm';
import type { Executor } from '../../db';
import { pgTableFor } from './sync.pg-registry';
import type { PushOp } from './sync.service';

/* eslint-disable @typescript-eslint/no-explicit-any -- generic pg applier keyed by the shared SYNC_ENTITIES registry */
type AnyPgTable = any;

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
 *
 * Tables resolve lazily per call — see sync.pg-registry.ts for the circular
 * import rationale.
 */
export async function applyToServerTables(
  exec: Executor,
  op: PushOp,
): Promise<void> {
  const table = pgTableFor(op.entity);
  if (!table) return; // unknown entity from a NEWER client — feed-only, lenient
  if (op.op === 'delete') {
    await exec.delete(table).where(eqId(table, op.entityId));
    return;
  }
  const row = coerceValues({
    ...(op.payload as Record<string, unknown>),
    id: op.entityId,
  });
  await exec
    .insert(table)
    .values(row)
    .onConflictDoUpdate({ target: table.id, set: stripKeys(row, ['id']) });
}

/**
 * Wire payloads are JSON: `*At` timestamps arrive as ISO strings (pg
 * date-mode columns need Date) and sqlite booleans arrive as 0/1.
 */
function coerceValues(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && k.endsWith('At')) {
      out[k] = new Date(v);
    } else if (BOOLEAN_KEYS.has(k) && typeof v === 'number') {
      out[k] = v !== 0;
    } else {
      out[k] = v;
    }
  }
  return out;
}

const BOOLEAN_KEYS = new Set(['isOwnerRole', 'isBuiltin', 'active', 'done']);

function eqId(table: AnyPgTable, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return eq(table.id, id);
}

function stripKeys(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!keys.includes(k)) rest[k] = v;
  return rest;
}
