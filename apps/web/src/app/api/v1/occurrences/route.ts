import { z } from 'zod';
import { occurrenceStatusSchema } from '@chorify/core';
import {
  authenticate,
  occurrencesService,
  requirePermission,
  route,
} from '@/lib/server';

const rangeQuery = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: occurrenceStatusSchema.optional(),
  personId: z.string().uuid().optional(),
});

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'responsibilities.view');
    const url = new URL(req.url);
    const query = rangeQuery.parse({
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      personId: url.searchParams.get('personId') ?? undefined,
    });
    const occurrences = await occurrencesService.listRange(ctx.session.householdId, query);
    return { occurrences };
  });
}
