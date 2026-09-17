import { z } from 'zod';
import { snoozeRecurringItemSchema, updateRecurringItemSchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  resourcesService,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

/** PATCH — rename/recadence/pause (§4A.3). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_shopping');
    const { id } = idParams.parse(await params);
    const input = updateRecurringItemSchema.parse(await readJson(req));
    const item = await resourcesService.updateRecurringItem(ctx.session.householdId, id, input);
    return { item };
  });
}

/** POST — the [Not now] exit: fixed snooze (D109), default 3 days. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_shopping');
    const { id } = idParams.parse(await params);
    const { days } = snoozeRecurringItemSchema.parse(await readJson(req));
    const item = await resourcesService.snoozeRecurringItem(ctx.session.householdId, id, days);
    return { item };
  });
}

/** DELETE — soft-archive (§4A.3): reminders disappear, history stays. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'resources.manage_shopping');
    const { id } = idParams.parse(await params);
    await resourcesService.archiveRecurringItem(ctx.session.householdId, id);
    return { ok: true };
  });
}
