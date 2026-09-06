import { z } from 'zod';
import { updateSupplySchema } from '@chorify/core';
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
    requirePermission(ctx, 'resources.manage_supplies');
    const { id } = idParams.parse(await params);
    const input = updateSupplySchema.parse(await readJson(req));
    const supply = await resourcesService.updateSupply(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { supply };
  });
}
