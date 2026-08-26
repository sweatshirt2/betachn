import { FACTORY_MATRICES, type BuiltinRoleKey, type PermissionMap } from '../../permissions';

export interface ResettableRole {
  builtinKey: string | null;
  isBuiltin: boolean;
  defaultPermissions: PermissionMap;
}

/**
 * "Reset to default" (CN §17 / invariant 14): builtins restore the factory
 * matrix; custom roles restore the create-time snapshot.
 */
export function resetMatrixFor(role: ResettableRole): PermissionMap {
  if (role.isBuiltin && role.builtinKey && role.builtinKey in FACTORY_MATRICES) {
    return FACTORY_MATRICES[role.builtinKey as BuiltinRoleKey];
  }
  return { ...role.defaultPermissions };
}

/**
 * LAST_OWNER invariant (§6.20): after any ownership-affecting mutation
 * (role demotion, unassignment, person removal) at least one owner holder
 * must remain. Callers compute `ownerHoldersAfter` inside their transaction.
 */
export function lastOwnerBlockers(ownerHoldersAfter: number): string[] {
  return ownerHoldersAfter < 1 ? ['LAST_OWNER'] : [];
}

/** Canonical EN display names — clients localize by `builtinKey`, never by this text. */
export const BUILTIN_ROLE_NAMES: Record<BuiltinRoleKey, string> = {
  father: 'Father',
  mother: 'Mother',
  grandfather: 'Grandfather',
  grandmother: 'Grandmother',
  guardian: 'Guardian',
  adult: 'Adult',
  teenager: 'Teenager',
  responsible_child: 'Responsible Child',
  child: 'Child',
  supervised_child: 'Supervised Child',
  family_member: 'Family Member',
};

/** The 11 builtin preset rows seeded for every new household (§4.6/§4.7). */
export function builtinRoleSeedRows(householdId: string): Array<{
  householdId: string;
  builtinKey: BuiltinRoleKey;
  name: string;
  isBuiltin: true;
  isOwnerRole: boolean;
  permissions: PermissionMap;
  defaultPermissions: PermissionMap;
}> {
  return (Object.keys(FACTORY_MATRICES) as BuiltinRoleKey[]).map((builtinKey) => ({
    householdId,
    builtinKey,
    name: BUILTIN_ROLE_NAMES[builtinKey],
    isBuiltin: true as const,
    // Exactly ONE owner-permission role exists at creation (CN §20–22):
    // Father and Mother presets both carry ownership authority.
    isOwnerRole: builtinKey === 'father' || builtinKey === 'mother',
    permissions: { ...FACTORY_MATRICES[builtinKey] },
    defaultPermissions: { ...FACTORY_MATRICES[builtinKey] },
  }));
}
