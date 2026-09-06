import { z } from 'zod';
import { occurrenceActionSchema } from '@chorify/core';
import {
  authenticate,
  occurrencesService,
  readJson,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

const ACTION_PERMISSION = {
  complete: 'responsibilities.complete',
  skip: 'responsibilities.complete',
  reopen: 'responsibilities.complete',
  reassign: 'responsibilities.reassign',
} as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const { id } = idParams.parse(await params);
    const action = occurrenceActionSchema.parse(await readJson(req));
    // Skip is gated by complete (§6); only reassign needs the assign key.
    requirePermission(ctx, ACTION_PERMISSION[action.action]);
    const occurrence = await occurrencesService.act(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      action,
    );
    return { occurrence };
  });
}
