import { z } from 'zod';
import { swapActionSchema } from '@chorify/core';
import {
  authenticate,
  occurrencesService,
  readJson,
  requireWritable,
  route,
} from '@/lib/server';

const swapParams = z.object({ id: z.string().uuid(), swapId: z.string().uuid() });

/**
 * PATCH /occurrences/:id/swaps/:swapId (§16b / D113): accept/decline by the
 * target, cancel by the requester. Accept applies the reassign in the same
 * transaction (one code path — §6.3 semantics ride along).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; swapId: string }> },
) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const { id: _id, swapId } = swapParams.parse(await params);
    const action = swapActionSchema.parse(await readJson(req));
    const swap = await occurrencesService.resolveSwap(
      ctx.effectivePersonId,
      ctx.session.householdId,
      swapId,
      action,
    );
    return { swap };
  });
}
