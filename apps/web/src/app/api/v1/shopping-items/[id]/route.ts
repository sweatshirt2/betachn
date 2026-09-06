import { z } from 'zod';
import { updateShoppingItemSchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  resourcesService,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_shopping');
    const { id } = idParams.parse(await params);
    const input = updateShoppingItemSchema.parse(await readJson(req));
    const item = await resourcesService.updateShoppingItem(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { item };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_shopping');
    const { id } = idParams.parse(await params);
    await resourcesService.removeShoppingItem(ctx.effectivePersonId, ctx.session.householdId, id);
    return { ok: true };
  });
}
