import { eq, inArray } from 'drizzle-orm';
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
import { DOMAIN_VIEW_KEY, type ViewerIdentity } from './sync.rules';

/* eslint-disable @typescript-eslint/no-explicit-any -- generic snapshot keyed by the shared SYNC_ENTITIES registry */
type AnyPgTable = any;

/**
 * SYNC_ENTITIES ↔ pg tables — the server-side twin of the device registry.
 * KEY ORDER IS FK-SAFE (parents before children) — the device applies
 * sections in wire order, so people must never precede roles, etc.
 */
const PG_SNAPSHOT_TABLES: Record<string, { table: AnyPgTable; domain: keyof typeof DOMAIN_VIEW_KEY }> = {
  households: { table: households, domain: 'household' },
  roles: { table: roles, domain: 'household' },
  people: { table: people, domain: 'household' },
  users: { table: users, domain: 'household' },
  routines: { table: routines, domain: 'responsibilities' },
  rooms: { table: rooms, domain: 'home' },
  responsibilities: { table: responsibilities, domain: 'responsibilities' },
  subtasks: { table: subtasks, domain: 'responsibilities' },
  assignment_rules: { table: assignmentRules, domain: 'responsibilities' },
  occurrences: { table: occurrences, domain: 'responsibilities' },
  assets: { table: assets, domain: 'home' },
  service_records: { table: serviceRecords, domain: 'home' },
  supplies: { table: supplies, domain: 'resources' },
  shopping_items: { table: shoppingItems, domain: 'resources' },
  activity_events: { table: activityEvents, domain: 'household' },
  notifications: { table: notifications, domain: 'household' },
  notification_prefs: { table: notificationPrefs, domain: 'household' },
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
      where: eq(responsibilities.householdId, householdId),
      columns: { id: true },
    })) as unknown as Array<{ id: string }>
  ).map((r) => r.id);
  const assetIds = (
    (await exec.query.assets!.findMany({
      where: eq(assets.householdId, householdId),
      columns: { id: true },
    })) as unknown as Array<{ id: string }>
  ).map((r) => r.id);

  for (const [entity, spec] of Object.entries(PG_SNAPSHOT_TABLES)) {
    if (!viewer.resolves(DOMAIN_VIEW_KEY[spec.domain])) continue;
    const table = spec.table;
    let rows: Array<Record<string, unknown>>;
    if (entity === 'subtasks' || entity === 'assignment_rules') {
      if (responsibilityIds.length === 0) continue;
      rows = (await exec.query[camelOf(entity)]!.findMany({
        where: inArray(table.responsibilityId, responsibilityIds),
      })) as unknown as Array<Record<string, unknown>>;
    } else if (entity === 'service_records') {
      if (assetIds.length === 0) continue;
      rows = (await exec.query.serviceRecords!.findMany({
        where: inArray(serviceRecords.assetId, assetIds),
      })) as unknown as Array<Record<string, unknown>>;
    } else if (entity === 'households') {
      // The root row itself — no householdId column to filter on.
      rows = (await exec.query.households!.findMany({
        where: eq(households.id, householdId),
      })) as unknown as Array<Record<string, unknown>>;
    } else if (entity === 'notification_prefs') {
      // Person-keyed — only the viewer's own prefs travel (§4.12 audience).
      rows = (await exec.query.notificationPrefs!.findMany({
        where: eq(notificationPrefs.personId, viewer.personId),
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
    shopping_items: 'shoppingItems',
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
