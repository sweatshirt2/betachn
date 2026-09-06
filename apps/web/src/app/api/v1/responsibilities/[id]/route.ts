import { z } from 'zod';
import { updateResponsibilitySchema } from '@chorify/core';
import {
  authenticate,
  readJson,
  requirePermission,
  requireWritable,
  responsibilitiesService,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'responsibilities.view');
    const { id } = idParams.parse(await params);
    return responsibilitiesService.detail(ctx.session.householdId, id);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'responsibilities.create');
    const { id } = idParams.parse(await params);
    const input = updateResponsibilitySchema.parse(await readJson(req));
    // Schedule edits reshape assignments — assignees must be assignable.
    if (input.rules !== undefined) requirePermission(ctx, 'responsibilities.assign');
    const responsibility = await responsibilitiesService.update(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { responsibility };
  });
}
