import { z } from 'zod';
import { createSwapSchema } from '@chorify/core';
import {
  authenticate,
  occurrencesService,
  readJson,
  requireWritable,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

/**
 * POST /occurrences/:id/swaps (§16b / D113): offer this turn to another
 * member. Deliberately NOT gated by responsibilities.reassign — mutual
 * consent is the model; accepting still requires the target themself.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const { id } = idParams.parse(await params);
    const input = createSwapSchema.parse(await readJson(req));
    const swap = await occurrencesService.createSwap(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { swap };
  });
}
