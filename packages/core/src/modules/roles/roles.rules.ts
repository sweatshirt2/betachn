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
