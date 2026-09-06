import { z } from 'zod';
import { authenticate, route, socialService } from '@/lib/server';

const listQuery = z.object({
  unread: z.enum(['true', 'false']).optional(),
});

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    const url = new URL(req.url);
    const { unread } = listQuery.parse({ unread: url.searchParams.get('unread') ?? undefined });
    const notifications = await socialService.listNotifications(ctx.effectivePersonId, {
      unreadOnly: unread === 'true',
    });
    return { notifications };
  });
}
