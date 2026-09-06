import { googleLoginSchema, isAppError } from '@chorify/core';
import {
  authService,
  checkRateLimit,
  clearAuthFailures,
  clientIp,
  exchangeOAuthCode,
  readJson,
  recordAuthFailure,
  route,
} from '@/lib/server';

export async function POST(req: Request) {
  return route(async () => {
    const input = googleLoginSchema.parse(await readJson(req));
    const ip = clientIp(req);
    const identifier = 'google-login';
    await checkRateLimit(identifier, ip);
    try {
      const identity = await exchangeOAuthCode(input.oauthCode, input.redirectUri);
      const issued = await authService.loginWithGoogle(identity);
      await clearAuthFailures(identifier, ip);
      const context = await authService.authenticatedContext(issued.session);
      return { token: issued.token, context };
    } catch (error) {
      if (isAppError(error) && error.code === 'UNAUTHENTICATED') {
        await recordAuthFailure(identifier, ip);
      }
      throw error;
    }
  });
}
