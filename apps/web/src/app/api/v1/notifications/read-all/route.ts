import { authenticate, requireWritable, route, socialService } from '@/lib/server';

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const marked = await socialService.markAllRead(ctx.session.householdId, ctx.effectivePersonId);
    return { marked };
  });
}
