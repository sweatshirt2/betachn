import { z } from 'zod';
import { updateRoutineSchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  routinesService,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'responsibilities.manage_routines');
    const { id } = idParams.parse(await params);
    const input = updateRoutineSchema.parse(await readJson(req));
    const routine = await routinesService.update(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { routine };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'responsibilities.manage_routines');
    const { id } = idParams.parse(await params);
    await routinesService.remove(ctx.effectivePersonId, ctx.session.householdId, id);
    return { ok: true };
  });
}
