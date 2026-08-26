import { describe, expect, it } from 'vitest';
import type { PermKey } from '../../permissions';
import { matchesViewer, type ChangeAudience, type ViewerIdentity } from './sync.rules';

function viewer(
  overrides: Partial<{ personId: string; roleIds: string[]; grants: PermKey[] }> = {},
): ViewerIdentity {
  const grants = overrides.grants ?? [];
  return {
    personId: overrides.personId ?? 'p-viewer',
    roleIds: overrides.roleIds ?? [],
    resolves: (key) => grants.includes(key),
  };
}

const financeChange: ChangeAudience = {
  audienceType: 'all',
  audienceIds: [],
  domain: 'finances',
};

describe('sync audience evaluation (D61)', () => {
  it('gates every audience type by the domain permission', () => {
    const allowed = viewer({ grants: ['finances.view'] });
    const denied = viewer({ grants: [] });
    expect(matchesViewer(financeChange, allowed)).toBe(true);
    expect(matchesViewer(financeChange, denied)).toBe(false);
  });

  it('member-scoped changes reach exactly the listed members', () => {
    const change: ChangeAudience = { audienceType: 'members', audienceIds: ['p1', 'p2'], domain: 'responsibilities' };
    expect(matchesViewer(change, viewer({ personId: 'p1', grants: ['responsibilities.view'] }))).toBe(true);
    expect(matchesViewer(change, viewer({ personId: 'p3', grants: ['responsibilities.view'] }))).toBe(false);
  });

  it('role-scoped changes follow CURRENT membership at pull time — promotion picks up history', () => {
    const change: ChangeAudience = { audienceType: 'roles', audienceIds: ['role-guardian'], domain: 'home' };
    const beforePromotion = viewer({ roleIds: ['role-child'], grants: ['home.view_assets'] });
    const afterPromotion = viewer({ roleIds: ['role-guardian'], grants: ['home.view_assets'] });
    expect(matchesViewer(change, beforePromotion)).toBe(false);
    expect(matchesViewer(change, afterPromotion)).toBe(true);
  });

  it('demotion retroactively stops matching role-scoped changes', () => {
    const change: ChangeAudience = { audienceType: 'roles', audienceIds: ['role-guardian'], domain: 'household' };
    const demoted = viewer({ roleIds: ['role-child'], grants: ['household.view_people'] });
    expect(matchesViewer(change, demoted)).toBe(false);
  });

  it('a deleted-role audience matches nobody', () => {
    const change: ChangeAudience = { audienceType: 'roles', audienceIds: ['role-deleted'], domain: 'home' };
    expect(matchesViewer(change, viewer({ roleIds: ['role-guardian'], grants: ['home.view_assets'] }))).toBe(false);
  });

  it('finance-domain "all" never reaches a viewer lacking finances.view (CN XIX-4)', () => {
    const child = viewer({ personId: 'sami', grants: ['responsibilities.view'] });
    expect(matchesViewer(financeChange, child)).toBe(false);
  });
});
