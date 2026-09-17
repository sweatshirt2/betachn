import type { AuthenticatedContext } from '@chorify/core';
import { authenticate, authService, route } from '@/lib/server';

/**
 * GET /auth/me — boot-time session validation. A persisted Bearer token is
 * only trustworthy once the server confirms it still resolves to a session
 * row (reseeds, session expiry and device wipes all invalidate it silently).
 * Returns the same context shape as /auth/login so the client can refresh
 * its identity snapshot in one round-trip; an unknown token is a 401
 * UNAUTHENTICATED, which the client's eviction path turns into /login.
 * Device-mode sessions carry no Bearer — the client skips this endpoint
 * entirely for them.
 */
export async function GET(req: Request) {
  return route(async (): Promise<AuthenticatedContext> => {
    const ctx = await authenticate(req);
    return authService.authenticatedContext(ctx.session);
  });
}
