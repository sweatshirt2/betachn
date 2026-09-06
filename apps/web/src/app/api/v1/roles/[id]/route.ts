import { z } from 'zod';
import { updateRoleSchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  rolesService,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'household.manage_roles');
    const { id } = idParams.parse(await params);
    const input = updateRoleSchema.parse(await readJson(req));
    const role = await rolesService.update(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { role };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'household.manage_roles');
    const { id } = idParams.parse(await params);
    await rolesService.remove(ctx.effectivePersonId, ctx.session.householdId, id);
    return { ok: true };
  });
}
