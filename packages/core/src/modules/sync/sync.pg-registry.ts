import * as db from '@chorify/db';

/* eslint-disable @typescript-eslint/no-explicit-any -- generic pg registry keyed by the shared SYNC_ENTITIES names */
type AnyPgTable = any;

/**
 * SYNC_ENTITIES wire name → @chorify/db export name. Most keys already are
 * the export name; snake_case wire names map to their camelCase exports
 * (the same mapping the snapshot's RQB keys need).
 */
const DB_EXPORT_BY_ENTITY: Record<string, string> = {
  households: 'households',
  people: 'people',
  users: 'users',
  roles: 'roles',
  routines: 'routines',
  responsibilities: 'responsibilities',
  subtasks: 'subtasks',
  assignment_rules: 'assignmentRules',
  occurrences: 'occurrences',
  rooms: 'rooms',
  assets: 'assets',
  service_records: 'serviceRecords',
  supplies: 'supplies',
  shopping_items: 'shoppingItems',
  activity_events: 'activityEvents',
  notifications: 'notifications',
  notification_prefs: 'notificationPrefs',
};

/**
 * Resolve a pg table LAZILY at call time from the live @chorify/db namespace.
 *
 * Why lazy: packages/db's barrel re-exports the sync unions from @chorify/core
 * (D69) while core's sync module consumes db's tables — a module-evaluation
 * cycle. A registry object literal built at module init captured `undefined`
 * for every table whenever core's module was entered first (ESM vitest/tsx;
 * the Next/webpack bundle only worked by entry-order luck). Live namespace
 * bindings are safe under every module graph, so D91 write-through and the
 * D92 snapshot resolve no matter who is entered first.
 */
export function pgTableFor(entity: string): AnyPgTable {
  const name = DB_EXPORT_BY_ENTITY[entity];
  if (!name) return undefined;
  return (db as unknown as Record<string, AnyPgTable>)[name];
}

/** Lazy access to any @chorify/db export by name (live namespace binding). */
export function dbExport(name: string): AnyPgTable {
  return (db as unknown as Record<string, AnyPgTable>)[name];
}

/** All known SYNC_ENTITIES names (registry iteration order = FK-safe wire order). */
export function pgEntityNames(): string[] {
  return Object.keys(DB_EXPORT_BY_ENTITY);
}
