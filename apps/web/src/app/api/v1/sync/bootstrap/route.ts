import type { FeedChange } from '@chorify/core';
import { authenticate, route, syncService, syncViewer } from '@/lib/server';

/** Full visible snapshot for empty/stale devices — paged pulls under the hood. */
export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    const viewer = await syncViewer(ctx);
    const changes: FeedChange[] = [];
    let cursor = 0;
    for (let page = 0; page < 20; page++) {
      const result = await syncService.pull(viewer, cursor, 500);
      changes.push(...result.changes);
      cursor = result.cursor;
      if (!result.hasMore) break;
    }
    return { changes, cursor };
  });
}
