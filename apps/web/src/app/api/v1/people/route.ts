import { createPersonSchema } from '@chorify/core';
import {
  authenticate,
  peopleService,
  readJson,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'household.view_people');
    return { people: await peopleService.list(ctx.session.householdId) };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'household.add_people');
    const input = createPersonSchema.parse(await readJson(req));
    const person = await peopleService.create(
      ctx.effectivePersonId,
      ctx.session.householdId,
      input,
    );
    return { person };
  });
}
