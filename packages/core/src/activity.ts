/**
 * Activity event builders (§4.10 / §6.13). Events persist `{type, params}`
 * i18n KEYS plus the permission `domain` that gates feed visibility — never
 * prose, so EN/አማርኛ both render historical entries.
 *
 * Param values may carry proper-noun SNAPSHOTS (person names, chore titles,
 * counts) — those are household data rendered inside localized templates, not
 * server prose. Renaming a person later must not rewrite history.
 */

/** Mirrors activity_events.domain (§4.5). Finance reserved until the module lands. */
export const ACTIVITY_DOMAINS = ['household', 'responsibilities', 'home', 'resources'] as const;
export type ActivityDomain = (typeof ACTIVITY_DOMAINS)[number] | 'finances';

/** Full v1 emission catalog. Adding an event = add here; domain is derived. */
export const ACTIVITY_TYPES = [
  'household.created',
  'household.updated',
  'household.exported',
  'household.imported',
  'person.added',
  'person.updated',
  'person.removed',
  'role.added',
  'role.updated',
  'role.reset',
  'role.removed',
  'responsibility.created',
  'responsibility.updated',
  'responsibility.archived',
  'routine.created',
  'routine.updated',
  'routine.archived',
  'routine.removed',
  'occurrence.completed',
  'occurrence.skipped',
  'occurrence.reopened',
  'occurrence.reassigned',
  'occurrence.missed',
  'room.added',
  'room.updated',
  'room.removed',
  'asset.added',
  'asset.updated',
  'asset.removed',
  'asset.serviced',
  'supply.added',
  'supply.low',
  'supply.out',
  'shopping_item.added',
  'shopping_item.purchased',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Static lookup — the single source mapping event types to visibility gates. */
export const DOMAIN_BY_TYPE: Record<ActivityType, ActivityDomain> = {
  'household.created': 'household',
  'household.updated': 'household',
  'household.exported': 'household',
  'household.imported': 'household',
  'person.added': 'household',
  'person.updated': 'household',
  'person.removed': 'household',
  'role.added': 'household',
  'role.updated': 'household',
  'role.reset': 'household',
  'role.removed': 'household',
  'responsibility.created': 'responsibilities',
  'responsibility.updated': 'responsibilities',
  'responsibility.archived': 'responsibilities',
  'routine.created': 'responsibilities',
  'routine.updated': 'responsibilities',
  'routine.archived': 'responsibilities',
  'routine.removed': 'responsibilities',
  'occurrence.completed': 'responsibilities',
  'occurrence.skipped': 'responsibilities',
  'occurrence.reopened': 'responsibilities',
  'occurrence.reassigned': 'responsibilities',
  'occurrence.missed': 'responsibilities',
  'room.added': 'home',
  'room.updated': 'home',
  'room.removed': 'home',
  'asset.added': 'home',
  'asset.updated': 'home',
  'asset.removed': 'home',
  'asset.serviced': 'home',
  'supply.added': 'resources',
  // State machine law (§6.11): activity ONLY when ENTERING low/out.
  'supply.low': 'resources',
  'supply.out': 'resources',
  'shopping_item.added': 'resources',
  'shopping_item.purchased': 'resources',
};

/** What persists into activity_events (actor/household columns set by callers). */
export interface ActivityDraft {
  type: ActivityType;
  /** i18n interpolation params + name/title snapshots. */
  payload: Record<string, unknown>;
  domain: ActivityDomain;
}

export function activityDomain(type: ActivityType): ActivityDomain {
  return DOMAIN_BY_TYPE[type];
}

export function buildActivity(
  type: ActivityType,
  payload: Record<string, unknown> = {},
): ActivityDraft {
  return { type, payload, domain: DOMAIN_BY_TYPE[type] };
}
