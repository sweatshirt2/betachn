import { isAppError, loginSchema } from '@chorify/core';
import {
  authService,
  checkRateLimit,
  clearAuthFailures,
  clientIp,
  readJson,
  recordAuthFailure,
  route,
} from '@/lib/server';

export async function POST(req: Request) {
  return route(async () => {
    const input = loginSchema.parse(await readJson(req));
    const ip = clientIp(req);
    const identifier = `login:${input.code.toLowerCase()}:${input.username.toLowerCase()}`;
    await checkRateLimit(identifier, ip);
    try {
      const issued = await authService.login(input);
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
