import type { ViewerIdentity } from '@chorify/core';
import { peopleService } from './services';
import type { AuthContext } from './auth';

/** Live identity snapshot for sync pull/push (D61 evaluation happens per pull). */
export async function syncViewer(
  ctx: AuthContext,
): Promise<ViewerIdentity & { householdId: string }> {
  const person = await peopleService.get(ctx.session.householdId, ctx.effectivePersonId);
  return {
    personId: ctx.effectivePersonId,
    householdId: ctx.session.householdId,
    roleIds: person.roleId ? [person.roleId] : [],
    resolves: (permission) => ctx.permissionMap[permission] === true,
  };
}
