import { z } from 'zod';
import { AppError, updateResponsibilitySchema } from '@chorify/core';
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
    // No single-get service exists — detail composes from list (household-scale).
    const all = await responsibilitiesService.list(ctx.session.householdId, { includeArchived: true });
    const responsibility = all.find((r) => r.id === id);
    if (!responsibility) throw new AppError('NOT_FOUND', 'Responsibility not found');
    return { responsibility };
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
