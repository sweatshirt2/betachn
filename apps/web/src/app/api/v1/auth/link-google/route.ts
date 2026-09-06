import { linkGoogleSchema } from '@chorify/core';
import { authenticate, authService, exchangeOAuthCode, readJson, requireWritable, route } from '@/lib/server';

export async function POST(req: Request) {
  return route(async () => {
    const ctx = await authenticate(req);
    requireWritable(ctx);
    const input = linkGoogleSchema.parse(await readJson(req));
    await authService.linkGoogle(
      ctx.session,
      input,
      await exchangeOAuthCode(input.oauthCode, input.redirectUri),
    );
    return { ok: true };
  });
}
