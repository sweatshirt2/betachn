import { createRecurringItemSchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  resourcesService,
  route,
} from '@/lib/server';

/** D81: every member sees due reminders read-only; manage_shopping mutates. */
export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    return { items: await resourcesService.listRecurringItems(ctx.session.householdId) };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_shopping');
    const input = createRecurringItemSchema.parse(await readJson(req));
    const clientUuid = req.headers.get('X-Client-Uuid') ?? '';
    const item = await resourcesService.createRecurringItem(
      ctx.effectivePersonId,
      ctx.session.householdId,
      clientUuid,
      input,
    );
    return { item };
  });
}
