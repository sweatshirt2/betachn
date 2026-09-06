import { switchProfileSchema } from '@chorify/core';
import { authenticate, authService, readJson, requireWritable, route } from '@/lib/server';

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const input = switchProfileSchema.parse(await readJson(req));
    const session = await authService.switchProfile(ctx.session, input);
    const context = await authService.authenticatedContext(session);
    return { session, context };
  });
}
