import { z } from 'zod';
import { computeSupplyCycleStats } from '@chorify/core';
import { authenticate, resourcesService, route } from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

/**
 * §4A.1 / D102: supply event log + derived consumption-cycle facts. Read
 * endpoint — auth-only like the supply list itself (D81: supplies are visible
 * to every member; only mutations need manage_* keys). Stats come from the
 * pure rules so the Flutter app gets one payload.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(_req);
    const { id } = idParams.parse(await params);
    const events = await resourcesService.listSupplyEvents(ctx.session.householdId, id);
    const stats = computeSupplyCycleStats(
      events.map((e) => ({ type: e.type, occurredAt: e.occurredAt })),
      new Date(),
    );
    return { events, stats };
  });
}
