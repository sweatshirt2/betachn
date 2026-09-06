import { z } from 'zod';
import { updatePersonSchema } from '@chorify/core';
import {
  authenticate,
  peopleService,
  readJson,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'household.view_people');
    const { id } = idParams.parse(await params);
    return { person: await peopleService.get(ctx.session.householdId, id) };
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const { id } = idParams.parse(await params);
    const input = updatePersonSchema.parse(await readJson(req));
    // Role and override edits reshape authority — they need configuration
    // access; plain profile edits stay under member management.
    requirePermission(
      ctx,
      input.roleId !== undefined || input.permissionOverrides !== undefined
        ? 'household.configure_permissions'
        : 'household.add_people',
    );
    const person = await peopleService.update(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { person };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'household.remove_people');
    const { id } = idParams.parse(await params);
    await peopleService.remove(ctx.effectivePersonId, ctx.session.householdId, id);
    // Profile switch targets may vanish — a deleted active person resolves
    // to UNAUTHENTICATED on the next request via the normal resolve path.
    return { ok: true };
  });
}
