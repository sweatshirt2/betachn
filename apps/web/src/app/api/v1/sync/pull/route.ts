import { z } from 'zod';
import { authenticate, route, syncService, syncViewer } from '@/lib/server';

const pullQuery = z.object({
  since: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    const url = new URL(req.url);
    const { since, limit } = pullQuery.parse({
      since: url.searchParams.get('since') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    const page = await syncService.pull(await syncViewer(ctx), since ?? 0, limit ?? 500);
    return { changes: page.changes, cursor: page.cursor, hasMore: page.hasMore };
  });
}
