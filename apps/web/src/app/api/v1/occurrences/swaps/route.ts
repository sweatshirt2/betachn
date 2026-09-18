import { z } from 'zod';
import { authenticate, occurrencesService, route } from '@/lib/server';

const swapQuery = z.object({ role: z.enum(['incoming', 'outgoing']) });

/**
 * GET /occurrences/swaps?role=incoming|outgoing (§16b / D113): open (pending)
 * swaps targeting (incoming = Today swap cards) or offered by (outgoing =
 * cancel entry) the caller. Read-only — auth-only, like /occurrences.
 */
export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    const { role } = swapQuery.parse({
      role: new URL(req.url).searchParams.get('role') ?? 'incoming',
    });
    const swaps =
      role === 'incoming'
        ? await occurrencesService.listIncomingSwaps(ctx.session.householdId, ctx.effectivePersonId)
        : await occurrencesService.listOutgoingSwaps(ctx.session.householdId, ctx.effectivePersonId);
    return { swaps };
  });
}
