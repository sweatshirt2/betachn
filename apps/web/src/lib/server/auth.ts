import { permissionMapForPerson, type PermissionMap, type PermKey, type SessionSnapshot } from '@chorify/core';
import { AppError } from '@chorify/core';
import { authService, peopleService, uow } from './services';

export type AuthContext = {
  session: SessionSnapshot;
  rawToken: string;
  /** Person permissions resolve against — the viewed person in view-as mode. */
  effectivePersonId: string;
  viewAsPersonId: string | null;
  permissionMap: PermissionMap;
};

/** Bearer resolve → session; throws UNAUTHENTICATED without a valid token. */
export async function authenticate(req: Request): Promise<AuthContext> {
  const header = req.headers.get('authorization');
  const rawToken = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!rawToken) throw new AppError('UNAUTHENTICATED', 'Sign in again');
  const session = await authService.resolve(rawToken);
  const viewAsPersonId = await resolveViewAs(req, session);
  const effectivePersonId = viewAsPersonId ?? session.activePersonId;
  const permissionMap = await permissionMapForPerson(uow.exec, effectivePersonId);
  return { session, rawToken, effectivePersonId, viewAsPersonId, permissionMap };
}

/**
 * View-as (§4.6): read-only preview gated on configure_permissions or
 * manage_ownership; a non-privileged header is rejected, never ignored.
 */
async function resolveViewAs(req: Request, session: SessionSnapshot): Promise<string | null> {
  const target = req.headers.get('X-View-As-Person-Id')?.trim();
  if (!target) return null;
  if (target === session.activePersonId) return null;
  const requesterMap = await permissionMapForPerson(uow.exec, session.activePersonId);
  if (!requesterMap['household.configure_permissions'] && !requesterMap['household.manage_ownership']) {
    throw new AppError('FORBIDDEN', 'Viewing as another member needs configuration access', {
      missingPermission: 'household.configure_permissions',
    });
  }
  await peopleService.get(session.householdId, target);
  return target;
}

/** Display + server gate: throws FORBIDDEN with the missing key. */
export function requirePermission(ctx: AuthContext, key: PermKey): void {
  if (!ctx.permissionMap[key]) {
    throw new AppError('FORBIDDEN', 'You do not have permission for this', { missingPermission: key });
  }
}

/** View-as is strictly read-only — every mutation calls this first. */
export function requireWritable(ctx: AuthContext): void {
  if (ctx.viewAsPersonId) {
    throw new AppError('VIEW_AS_READONLY', 'Preview only — exit View-as to make changes');
  }
}
