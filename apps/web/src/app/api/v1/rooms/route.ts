import { createRoomSchema } from '@chorify/core';
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
    return { rooms: await homeService.listRooms(ctx.session.householdId) };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    requirePermission(ctx, 'home.manage_assets');
    const input = createRoomSchema.parse(await readJson(req));
    const room = await homeService.createRoom(ctx.effectivePersonId, ctx.session.householdId, input);
    return { room };
  });
}
