import { createShoppingItemSchema } from '@chorify/core';
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
    return { items: await resourcesService.listShoppingItems(ctx.session.householdId) };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_shopping');
    const input = createShoppingItemSchema.parse(await readJson(req));
    const item = await resourcesService.createShoppingItem(
      ctx.effectivePersonId,
      ctx.session.householdId,
      input,
    );
    return { item };
  });
}
