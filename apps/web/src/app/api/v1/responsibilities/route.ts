import { z } from 'zod';
import { createResponsibilitySchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  responsibilitiesService,
  route,
} from '@/lib/server';

const listQuery = z.object({
  archived: z.enum(['true', 'false']).optional(),
});

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'responsibilities.view');
    const url = new URL(req.url);
    const { archived } = listQuery.parse({ archived: url.searchParams.get('archived') ?? undefined });
    const responsibilities = await responsibilitiesService.list(ctx.session.householdId, {
      includeArchived: archived === 'true',
    });
    return { responsibilities };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'responsibilities.create');
    const input = createResponsibilitySchema.parse(await readJson(req));
    const responsibility = await responsibilitiesService.create(
      ctx.effectivePersonId,
      ctx.session.householdId,
      input,
    );
    return { responsibility };
  });
}
