import { registerOnlineSchema } from '@chorify/core';
import { authService, exchangeOAuthCode, readJson, route } from '@/lib/server';

export async function POST(req: Request) {
  return route(async () => {
    const input = registerOnlineSchema.parse(await readJson(req));
    const issued =
      input.mode === 'phone'
        ? await authService.registerWithPassword(input)
        : await authService.registerWithGoogle(
            input,
            await exchangeOAuthCode(input.oauthCode, input.redirectUri),
          );
    const context = await authService.authenticatedContext(issued.session);
    return { token: issued.token, context };
  });
}
