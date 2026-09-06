import { permissionMapForPerson } from '@chorify/core';
import { authenticate, authService, peopleService, route, uow } from '@/lib/server';

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    const context = await authService.authenticatedContext(ctx.session);
    if (!ctx.viewAsPersonId) return { context };
    const viewed = await peopleService.get(ctx.session.householdId, ctx.viewAsPersonId);
    return {
      context,
      viewAs: {
        personId: viewed.id,
        personName: viewed.name,
        permissionMap: await permissionMapForPerson(uow.exec, ctx.viewAsPersonId),
      },
    };
  });
}
