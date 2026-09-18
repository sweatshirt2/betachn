import { eq, inArray } from 'drizzle-orm';
import type { Executor } from '../../db';
import { DOMAIN_VIEW_KEY, type ViewerIdentity } from './sync.rules';
import { dbExport, pgTableFor, householdEntityNames } from '../../db-pg-tables';

/* eslint-disable @typescript-eslint/no-explicit-any -- generic snapshot keyed by the shared SYNC_ENTITIES registry */
type AnyPgTable = any;

/**
 * SYNC_ENTITIES iteration order — FK-SAFE (parents before children); the
 * device applies sections in wire order, so people must never precede
 * roles, etc. Tables resolve lazily per entity (see sync.pg-registry.ts
 * for the circular import rationale).
 */
const SNAPSHOT_ENTITIES = householdEntityNames();

/** Which permission domain gates each snapshot section (CN XIX-4). */
const DOMAIN_BY_ENTITY: Record<string, keyof typeof DOMAIN_VIEW_KEY> = {
  households: 'household',
  roles: 'household',
  people: 'household',
  users: 'household',
  routines: 'responsibilities',
  rooms: 'home',
  responsibilities: 'responsibilities',
  subtasks: 'responsibilities',
  assignment_rules: 'responsibilities',
  occurrences: 'responsibilities',
  occurrence_swaps: 'responsibilities',
  assets: 'home',
  service_records: 'home',
  supplies: 'resources',
  supply_events: 'resources',
  shopping_items: 'resources',
  recurring_shopping_items: 'resources',
  activity_events: 'household',
  notifications: 'household',
  notification_prefs: 'household',
};

/**
 * D92 bootstrap snapshot: full TABLE rows per SYNC_ENTITIES section, filtered
 * by the viewer's permission domains (CN XIX-4) and scoped to their
 * audiences where the table carries them (notifications → recipientPersonId,
 * notification_prefs → personId). With D91 write-through the tables ARE the
 * converged state — bootstrap reads rows, not feed history.
 */
export async function buildBootstrapSnapshot(
  exec: Executor,
  householdId: string,
  viewer: ViewerIdentity,
  headSeq: number,
): Promise<{ sections: Record<string, Array<Record<string, unknown>>>; cursor: number }> {
  const sections: Record<string, Array<Record<string, unknown>>> = {};
  // Parent-child tables hang off responsibility/asset ids — collect once.
  const responsibilityIds = (
    (await exec.query.responsibilities!.findMany({
      where: eq(dbExport('responsibilities').householdId, householdId),
      columns: { id: true },
    })) as unknown as Array<{ id: string }>
  ).map((r) => r.id);
  const assetIds = (
    (await exec.query.assets!.findMany({
      where: eq(dbExport('assets').householdId, householdId),
      columns: { id: true },
    })) as unknown as Array<{ id: string }>
  ).map((r) => r.id);

  for (const entity of SNAPSHOT_ENTITIES) {
    const table: AnyPgTable = pgTableFor(entity);
    if (!table) continue;
    const domain = DOMAIN_BY_ENTITY[entity];
    if (!domain || !viewer.resolves(DOMAIN_VIEW_KEY[domain])) continue;
    let rows: Array<Record<string, unknown>>;
    if (entity === 'subtasks' || entity === 'assignment_rules') {
      if (responsibilityIds.length === 0) continue;
      rows = (await exec.query[camelOf(entity)]!.findMany({
        where: inArray(table.responsibilityId, responsibilityIds),
      })) as unknown as Array<Record<string, unknown>>;
    } else if (entity === 'service_records') {
      if (assetIds.length === 0) continue;
      rows = (await exec.query.serviceRecords!.findMany({
        where: inArray(dbExport('serviceRecords').assetId, assetIds),
      })) as unknown as Array<Record<string, unknown>>;
    } else if (entity === 'households') {
      // The root row itself — no householdId column to filter on.
      rows = (await exec.query.households!.findMany({
        where: eq(dbExport('households').id, householdId),
      })) as unknown as Array<Record<string, unknown>>;
    } else if (entity === 'notification_prefs') {
      // Person-keyed — only the viewer's own prefs travel (§4.12 audience).
      rows = (await exec.query.notificationPrefs!.findMany({
        where: eq(dbExport('notificationPrefs').personId, viewer.personId),
      })) as unknown as Array<Record<string, unknown>>;
    } else {
      rows = (await exec.query[camelOf(entity)]!.findMany({
        where: eq(table.householdId, householdId),
      })) as unknown as Array<Record<string, unknown>>;
    }
    sections[entity] = filterAudience(entity, rows, viewer);
  }
  return { sections, cursor: headSeq };
}

/** householdId-less child tables hang off their parents (§4.11 export rule). */
function camelOf(entity: string): string {
  const map: Record<string, string> = {
    assignment_rules: 'assignmentRules',
    service_records: 'serviceRecords',
    supply_events: 'supplyEvents',
    shopping_items: 'shoppingItems',
    recurring_shopping_items: 'recurringShoppingItems',
  occurrence_swaps: 'occurrenceSwaps',
    activity_events: 'activityEvents',
    notification_prefs: 'notificationPrefs',
  };
  return map[entity] ?? entity;
}

/** Recipient/person scoping for notification-family tables. */
function filterAudience(
  entity: string,
  rows: Array<Record<string, unknown>>,
  viewer: ViewerIdentity,
): Array<Record<string, unknown>> {
  if (entity === 'notifications') {
    return rows.filter((r) => r.recipientPersonId === viewer.personId);
  }
  if (entity === 'notification_prefs') {
    return rows.filter((r) => r.personId === viewer.personId);
  }
  return rows;
}
