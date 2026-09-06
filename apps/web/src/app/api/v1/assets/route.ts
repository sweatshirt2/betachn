import { createAssetSchema } from '@chorify/core';
import {
  authenticate,
  homeService,
  readJson,
  requirePermission,
  requireWritable,
  route,
} from '@/lib/server';

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requirePermission(ctx, 'home.view_assets');
    return { assets: await homeService.listAssets(ctx.session.householdId) };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'home.manage_assets');
    const input = createAssetSchema.parse(await readJson(req));
    const asset = await homeService.createAsset(
      ctx.effectivePersonId,
      ctx.session.householdId,
      input,
    );
    return { asset };
  });
}
