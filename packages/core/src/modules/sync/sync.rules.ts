import type { PermKey } from '../../permissions';
import type { SyncDomain } from '@chorify/db';
/**
 * Which permission key gates visibility of a change in this domain
 * (no indirect leakage — CN XIX-4). Household-domain changes ride the
 * people-viewing permission.
 */
export const DOMAIN_VIEW_KEY: Record<SyncDomain, PermKey> = {
  household: 'household.view_people',
  responsibilities: 'responsibilities.view',
  finances: 'finances.view',
  home: 'home.view_assets',
  resources: 'resources.manage_supplies',
};

/** Symbolic audience exactly as persisted on household_changes (D61). */
export interface ChangeAudience {
  audienceType: 'members' | 'roles' | 'all';
  audienceIds: string[];
  domain: SyncDomain;
}

/** The requester's live identity snapshot at pull time. */
export interface ViewerIdentity {
  personId: string;
  roleIds: string[];
  resolves(permission: PermKey): boolean;
}

/**
 * Live evaluation (D61): audiences are NOT expanded at write time, so a
 * freshly promoted Guardian picks up role-scoped history on their next
 * pull. The permission gate runs for every audience type.
 */
export function matchesViewer(change: ChangeAudience, viewer: ViewerIdentity): boolean {
  if (!viewer.resolves(DOMAIN_VIEW_KEY[change.domain])) return false;
  switch (change.audienceType) {
    case 'all':
      return true;
    case 'members':
      return change.audienceIds.includes(viewer.personId);
    case 'roles':
      return change.audienceIds.some((roleId) => viewer.roleIds.includes(roleId));
    default:
      return false;
  }
}
