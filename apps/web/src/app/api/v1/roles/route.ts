import { createRoleSchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  rolesService,
  route,
} from '@/lib/server';

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'household.view_people');
    return { roles: await rolesService.list(ctx.session.householdId) };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'household.manage_roles');
    const input = createRoleSchema.parse(await readJson(req));
    const role = await rolesService.create(ctx.effectivePersonId, ctx.session.householdId, input);
    return { role };
  });
}
