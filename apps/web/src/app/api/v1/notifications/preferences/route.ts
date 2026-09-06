import { putNotificationPrefsSchema } from '@chorify/core';
import { authenticate, readJson, requireWritable, route, socialService } from '@/lib/server';

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    return { preferences: await socialService.getPrefs(ctx.effectivePersonId) };
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const input = putNotificationPrefsSchema.parse(await readJson(req));
    const preferences = await socialService.putPrefs(ctx.effectivePersonId, input);
    return { preferences };
  });
}
