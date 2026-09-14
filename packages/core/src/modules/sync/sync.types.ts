/** Wire-level sync vocabulary (§4.12) — shared by server routes and devices. */

export type ChangeOp = 'create' | 'update' | 'delete';
export type AudienceType = 'members' | 'roles' | 'all';

/** Permission domains gating change visibility (CN XIX-4). */
export type SyncDomain = 'household' | 'responsibilities' | 'finances' | 'home' | 'resources';

/**
 * Mirrorable entity names — EXACTLY the TXT export section names (§4.11), so
 * bootstrap snapshots, import adoption and LWW application share one registry.
 */
export const SYNC_ENTITIES = [
  'households',
  'people',
  'roles',
  'routines',
  'responsibilities',
  'subtasks',
  'assignment_rules',
  'occurrences',
  'rooms',
  'assets',
  'service_records',
  'supplies',
  'supply_events',
  'shopping_items',
  'activity_events',
  'notifications',
  'notification_prefs',
] as const;

export type SyncEntity = (typeof SYNC_ENTITIES)[number];
