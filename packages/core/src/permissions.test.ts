import { describe, expect, it } from 'vitest';
import {
  FACTORY_MATRICES,
  allPermKeys,
  customRoleBaseline,
  permissionMapFor,
  type PermKey,
  resolvePermission,
} from './permissions';
import { AppError } from './errors';
import { requirePermission } from './permissions';

const key = (k: string): PermKey => k as PermKey;

describe('resolvePermission — four tiers (§11)', () => {
  const childRole = { isOwnerRole: false, permissions: FACTORY_MATRICES.child };

  it('person override TRUE beats a role matrix FALSE', () => {
    const person = { role: childRole, permissionOverrides: { [key('finances.view')]: true } };
    expect(resolvePermission(person, key('finances.view'))).toBe(true);
  });

  it('person override FALSE beats even an owner role', () => {
    const owner = { isOwnerRole: true, permissions: FACTORY_MATRICES.mother };
    const person = { role: owner, permissionOverrides: { [key('household.remove_people')]: false } };
    expect(resolvePermission(person, key('household.remove_people'))).toBe(false);
  });

  it('owner flag grants everything the matrix does not list', () => {
    const owner = { isOwnerRole: true, permissions: FACTORY_MATRICES.child };
    expect(resolvePermission({ role: owner }, key('finances.manage_accounts'))).toBe(true);
  });

  it('role matrix grants listed keys; missing everything resolves false', () => {
    expect(resolvePermission({ role: childRole }, key('responsibilities.complete'))).toBe(true);
    expect(resolvePermission({}, key('household.view_people'))).toBe(false);
    expect(resolvePermission({ role: null }, key('resources.manage_supplies'))).toBe(false);
  });
});

describe('role reset semantics (§6.14 / invariant CN §14)', () => {
  it('custom-role baseline grants view+complete only', () => {
    const baseline = customRoleBaseline();
    expect(baseline[key('responsibilities.view')]).toBe(true);
    expect(baseline[key('responsibilities.complete')]).toBe(true);
    expect(allPermKeys().filter((k) => baseline[k]).length).toBe(2);
  });

  it('factory matrices are complete maps with expected spot checks', () => {
    for (const matrix of Object.values(FACTORY_MATRICES)) {
      for (const k of allPermKeys()) expect(typeof matrix[k]).toBe('boolean');
    }
    expect(FACTORY_MATRICES.father[key('finances.manage_goals')]).toBe(true);
    expect(FACTORY_MATRICES.adult[key('responsibilities.manage_routines')]).toBe(false);
    expect(FACTORY_MATRICES.teenager[key('resources.manage_purchases')]).toBe(false);
    expect(FACTORY_MATRICES.family_member[key('resources.manage_shopping')]).toBe(true);
    expect(FACTORY_MATRICES.grandmother[key('home.manage_assets')]).toBe(true);
    expect(FACTORY_MATRICES.guardian[key('finances.edit_expenses')]).toBe(false);
    expect(Object.keys(FACTORY_MATRICES).length).toBe(11);
  });

  it('reset restores snapshot while rename leaves permissions untouched', () => {
    const snapshot = customRoleBaseline();
    const livePermissions = { ...snapshot, [key('home.view_assets')]: true };
    // Reset = restore stored defaultPermissions copy:
    const afterReset = { ...livePermissions, ...snapshot };
    expect(afterReset[key('home.view_assets')]).toBe(false);

    // Rename never touches permissions (CN §78):
    const renamed = { name: 'Big Kids', permissions: livePermissions };
    expect(renamed.permissions).toBe(livePermissions);
  });
});

describe('permissionMapFor (full-map materialization)', () => {
  it('resolves every catalog key with override > owner > role > false precedence', () => {
    const person = {
      permissionOverrides: { 'responsibilities.assign': false, 'resources.manage_supplies': true },
      role: {
        isOwnerRole: false,
        permissions: { 'responsibilities.assign': true, 'responsibilities.view': true } as Partial<import('./permissions').PermissionMap>,
      },
    };
    const map = permissionMapFor(person);
    // override false beats a granting role
    expect(map['responsibilities.assign']).toBe(false);
    // role grant passes through
    expect(map['responsibilities.view']).toBe(true);
    // override true beats an empty role
    expect(map['resources.manage_supplies']).toBe(true);
    // nothing set anywhere → false (finances defaults closed for this role)
    expect(map['finances.view']).toBe(false);
    // map covers the whole catalog
    expect(Object.keys(map).length).toBe(allPermKeys().length);
  });

  it('owner flag grants everything, explicit false override still wins', () => {
    const ownerMap = permissionMapFor({
      role: { isOwnerRole: true, permissions: {} },
      permissionOverrides: { 'household.remove_people': false },
    });
    expect(ownerMap['responsibilities.complete']).toBe(true);
    expect(ownerMap['household.remove_people']).toBe(false);
  });

  it('roleless person with no overrides is all false', () => {
    const map = permissionMapFor({});
    expect(Object.values(map).every((v) => v === false)).toBe(true);
  });
});

describe('requirePermission', () => {
  it('passes silently when granted and throws FORBIDDEN with missingPermission otherwise', () => {
    const map = FACTORY_MATRICES.mother;
    expect(() => requirePermission(map, key('household.view_people'))).not.toThrow();

    try {
      requirePermission(FACTORY_MATRICES.child, key('finances.view'));
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      if (err instanceof AppError) {
        expect(err.code).toBe('FORBIDDEN');
        expect(err.httpStatus).toBe(403);
        expect(err.params?.missingPermission).toBe('finances.view');
      }
    }
  });
});
