import { and, eq } from 'drizzle-orm';
import type { DeviceDatabase } from '../client';
import {
  activityEvents,
  people,
} from '../schema';
import {
  households,
  assets,
  assignmentRules,
  notifications as notificationsTable,
  notificationPrefs,
  occurrences,
  responsibilities,
  roles,
  rooms,
  routines,
  serviceRecords,
  subtasks,
  supplies,
  users,
} from '../schema';
import { shoppingItems as shoppingItemsRef } from '../schema';
import type { PullChangeWire } from './transport';

/* eslint-disable @typescript-eslint/no-explicit-any -- generic row applier keyed by wire registry */
type AnySqliteTable = any;

/** SYNC_ENTITIES names ↔ device mirror tables (one registry, D69/D70 scope). */
export const ENTITY_TABLES: Record<string, AnySqliteTable> = {
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
  shopping_items: shoppingItemsRef,
  activity_events: activityEvents,
  notifications: notificationsTable,
  notification_prefs: notificationPrefs,
};

/**
 * Row-level LWW application (§6.28 / D60): arrival order IS precedence.
 * - delete ⇒ remove the row (later creates may resurrect it);
 * - create/update ⇒ full-row upsert on `id`, original ids preserved so every
 *   cross-reference survives adoption and sync alike.
 */
export async function applyChange(
  db: DeviceDatabase,
  table: AnySqliteTable,
  change: PullChangeWire,
): Promise<void> {
  if (change.op === 'delete') {
    await db.delete(table).where(eq(table.id, change.entityId));
    return;
  }
  const row = { ...(change.payload as Record<string, unknown>), id: change.entityId };
  await db
    .insert(table)
    .values(row)
    .onConflictDoUpdate({ target: table.id, set: stripKeys(row, ['id']) });
}

function stripKeys(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!keys.includes(k)) rest[k] = v;
  return rest;
}

export interface ConflictReport {
  /** Entities where ANOTHER actor's incoming change collides with own pending op. */
  overwritten: Array<{ entity: string; entityId: string; actorPersonId: string | null }>;
}

/**
 * Detects collisions BEFORE applying: an incoming change from someone else
 * that touches an entity this device still holds in pending_ops means our
 * local write lost the race (§6.28). Self-conflicts stay silent.
 */
export function findOverwritten(
  mePersonId: string | null,
  pendingEntityIds: Set<string>,
  changes: PullChangeWire[],
): ConflictReport['overwritten'] {
  return changes
    .filter((c) => c.actorPersonId !== mePersonId && pendingEntityIds.has(c.entityId))
    .map((c) => ({ entity: c.entity, entityId: c.entityId, actorPersonId: c.actorPersonId }));
}

/**
 * Coalesced loss notification (§6.28): ONE unread row per entity key with a
 * bumping `count` param, recipient = the losing device's active person.
 * Category rides `reminder` per D68 precedent (no dedicated bucket).
 */
export async function recordOverwrittenNotification(
  db: DeviceDatabase,
  input: {
    householdId: string;
    recipientPersonId: string;
    entity: string;
    entityId: string;
    actorPersonId: string | null;
    occurredAt: string;
    /** Rejected pushes (permission) vs overwritten rows (LWW loss). */
    kind?: 'sync.changeOverwritten' | 'sync.changeRejected';
  },
): Promise<void> {
  const kind = input.kind ?? 'sync.changeOverwritten';
  const entityKey = `${kind}:${input.entity}:${input.entityId}`;
  let byName: string | undefined;
  if (input.actorPersonId) {
    const actorRows = await db.select().from(people).where(eq(people.id, input.actorPersonId)).limit(1);
    const name = actorRows[0]?.name;
    if (typeof name === 'string') byName = name;
  }

  const existing = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.recipientPersonId, input.recipientPersonId), eq(notificationsTable.type, kind)));

  const match = existing.find(
    (n) => (n.paramsJson as Record<string, unknown>).entityKey === entityKey && n.readAt === null,
  );
  if (match) {
    const params = match.paramsJson as Record<string, number>;
    await db
      .update(notificationsTable)
      .set({ paramsJson: { ...match.paramsJson, count: Number(params.count ?? 1) + 1 } })
      .where(eq(notificationsTable.id, match.id));
    return;
  }

  await db.insert(notificationsTable).values({
    id: crypto.randomUUID(),
    householdId: input.householdId,
    recipientPersonId: input.recipientPersonId,
    category: 'reminder',
    type: kind,
    paramsJson: { entityKey, title: input.entity, count: 1, ...(byName ? { byName } : {}) },
    linkPath: null,
    createdAt: input.occurredAt,
  });
}
