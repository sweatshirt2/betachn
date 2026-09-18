import { reorderShoppingItemSchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  resourcesService,
  route,
} from '@/lib/server';

/**
 * POST /shopping-items/reorder (D115): drag-to-reorder — assign the dragged
 * item a sparse sortKey between its new neighbors. One row written.
 */
export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_shopping');
    const input = reorderShoppingItemSchema.parse(await readJson(req));
    const item = await resourcesService.reorderShoppingItem(
      ctx.effectivePersonId,
      ctx.session.householdId,
      input,
    );
    return { item };
  });
}
