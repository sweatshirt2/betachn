import { householdPreviewSchema } from '@chorify/core';
import { authService, checkRateLimit, clientIp, readJson, route } from '@/lib/server';

/**
 * POST /auth/household-preview (D101 step-down login, additive): public by
 * design like /auth/login — the client resolves the face grid BEFORE any
 * credentials exist. Rate-limited on its own identifier so it cannot be
 * used to enumerate codes faster than login itself.
 */
export async function POST(req: Request) {
  return route(async () => {
    const input = householdPreviewSchema.parse(await readJson(req));
    const ip = clientIp(req);
    await checkRateLimit(`preview:${input.code.toLowerCase()}`, ip);
    return authService.householdPreview(input);
  });
}
