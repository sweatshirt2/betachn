import { AppError } from '@chorify/core';
import { getGoogleConfig } from './env';

export type GoogleIdentity = { providerAccountId: string };

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/**
 * OAuth code exchange (D50): the client sends an authorization CODE, never
 * an id_token — the id_token arrives over direct TLS from Google. Signature
 * re-verification is unnecessary on that channel; iss/aud/exp are still
 * validated defensively.
 */
export async function exchangeOAuthCode(oauthCode: string, redirectUri: string): Promise<GoogleIdentity> {
  const config = getGoogleConfig();
  if (!config) throw new AppError('CONFLICT', 'Google sign-in is not configured yet');

  let tokenRes: Response;
  try {
    tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: oauthCode,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
  } catch {
    throw new AppError('UNAUTHENTICATED', 'Google sign-in failed — try again');
  }
  if (!tokenRes.ok) throw new AppError('UNAUTHENTICATED', 'Google sign-in failed — try again');

  const tokenJson = (await tokenRes.json()) as { id_token?: unknown };
  if (typeof tokenJson.id_token !== 'string') {
    throw new AppError('UNAUTHENTICATED', 'Google sign-in failed — try again');
  }
  return verifyIdToken(tokenJson.id_token, config.clientId);
}

function decodePayload(idToken: string): { sub?: unknown; iss?: unknown; aud?: unknown; exp?: unknown } {
  const parts = idToken.split('.');
  if (parts.length !== 3 || !parts[1]) throw new AppError('UNAUTHENTICATED', 'Google sign-in failed — try again');
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new AppError('UNAUTHENTICATED', 'Google sign-in failed — try again');
  }
}

function verifyIdToken(idToken: string, clientId: string): GoogleIdentity {
  const payload = decodePayload(idToken);
  const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    typeof payload.sub !== 'string' ||
    payload.sub.length === 0 ||
    !validIssuers.includes(String(payload.iss)) ||
    payload.aud !== clientId ||
    typeof payload.exp !== 'number' ||
    payload.exp <= nowSeconds
  ) {
    throw new AppError('UNAUTHENTICATED', 'Google sign-in failed — try again');
  }
  return { providerAccountId: payload.sub };
}
