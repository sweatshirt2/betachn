import { authenticate, authService, route } from '@/lib/server';

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    await authService.logout(ctx.rawToken);
    return { ok: true };
  });
}
