import { z } from 'zod';
import { authenticate, readJson, requirePermission, requireWritable, resourcesService, route } from '@/lib/server';

const dismissBody = z.object({
  supplyId: z.string().uuid(),
  forever: z.boolean().default(false),
});

/**
 * D108 suggestion endpoint: server-side pure evaluation picks the ONE
 * suggestible supply (≥2 completed cycles, sane range, no active reminder,
 * not dismissed). GET is auth-only (read-only); dismissal is a resources
 * mutation and syncs with the supplies row (LWW).
 */
export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    const suggestion = await resourcesService.suggestRecurringItem(ctx.session.householdId);
    return { suggestion };
  });
}

/** "Don't suggest again" (forever) or "Not now" (same endpoint, session-level is client-side). */
export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_supplies');
    const { supplyId } = dismissBody.parse(await readJson(req));
    await resourcesService.dismissRecurringSuggestion(ctx.session.householdId, supplyId);
    return { ok: true };
  });
}
