import { createRoutineSchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  routinesService,
  route,
} from '@/lib/server';

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'responsibilities.view');
    return { routines: await routinesService.list(ctx.session.householdId) };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'responsibilities.manage_routines');
    const input = createRoutineSchema.parse(await readJson(req));
    const routine = await routinesService.create(
      ctx.effectivePersonId,
      ctx.session.householdId,
      input,
    );
    return { routine };
  });
}
