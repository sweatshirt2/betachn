import { authenticate, route, syncService, syncViewer } from '@/lib/server';

/** Full visible TABLE snapshot for empty/stale devices (D92). */
export async function GET(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    return syncService.bootstrapSnapshot(await syncViewer(ctx));
  });
}
