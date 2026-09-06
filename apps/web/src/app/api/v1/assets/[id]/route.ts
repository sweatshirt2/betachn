import { z } from 'zod';
import { AppError, updateAssetSchema } from '@chorify/core';
import {
  authenticate,
  homeService,
  householdsService,
  readJson,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';

const idParams = z.object({ id: z.string().uuid() });

function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'home.view_assets');
    const { id } = idParams.parse(await params);
    // No single-get service — detail composes from list (household-scale).
    const assets = await homeService.listAssets(ctx.session.householdId);
    const asset = assets.find((a) => a.id === id);
    if (!asset) throw new AppError('NOT_FOUND', 'Asset not found');
    const household = await householdsService.get(ctx.session.householdId);
    const nextDue = await homeService.nextMaintenanceDueFor(
      ctx.session.householdId,
      id,
      todayIn(household.timezone),
    );
    return { asset, nextMaintenanceDue: nextDue };
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'home.manage_assets');
    const { id } = idParams.parse(await params);
    const input = updateAssetSchema.parse(await readJson(req));
    const asset = await homeService.updateAsset(
      ctx.effectivePersonId,
      ctx.session.householdId,
      id,
      input,
    );
    return { asset };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'home.manage_assets');
    const { id } = idParams.parse(await params);
    await homeService.removeAsset(ctx.effectivePersonId, ctx.session.householdId, id);
    return { ok: true };
  });
}
