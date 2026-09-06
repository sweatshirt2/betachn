import { z } from 'zod';
import { updateRoomSchema } from '@chorify/core';
import {
  authenticate,
  homeService,
  readJson,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'home.manage_assets');
    const { id } = idParams.parse(await params);
    const input = updateRoomSchema.parse(await readJson(req));
    const room = await homeService.updateRoom(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { room };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'home.manage_assets');
    const { id } = idParams.parse(await params);
    await homeService.removeRoom(ctx.effectivePersonId, ctx.session.householdId, id);
    return { ok: true };
  });
}
