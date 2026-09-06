import { createSupplySchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  resourcesService,
  route,
} from '@/lib/server';

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    return { supplies: await resourcesService.listSupplies(ctx.session.householdId) };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_supplies');
    const input = createSupplySchema.parse(await readJson(req));
    const supply = await resourcesService.createSupply(
      ctx.effectivePersonId,
      ctx.session.householdId,
      input,
    );
    return { supply };
  });
}
