/**
 * Return-to (post-login redirect): a signed-out visitor who taps a deep
 * link gets the welcome door, then lands on the thing they tapped after
 * signing in. sessionStorage scope is deliberate — per-tab, dies with the
 * tab, and survives the Google OAuth round-trip (same tab, same origin),
 * but a stale week-old entry can never hijack an unrelated login the way
 * a localStorage one would.
 */
const RETURN_TO_KEY = 'chorify-return-to';

/** Auth surfaces are never stashed — landing on /login after login is a loop. */
export const AUTH_PREFIXES = ['/login', '/onboarding', '/auth'];

/** True when the path is an auth surface (login, onboarding, OAuth callback). */
export function isAuthPath(pathname: string): boolean {
  return AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Only same-origin-safe app paths: starts with one '/', never '//'. */
function isSafePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

export function stashReturnTo(pathname: string, search = ''): void {
  const path = `${pathname}${search}`;
  if (!isSafePath(path)) return;
  if (isAuthPath(pathname)) return;
  try {
    sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    // private-mode — return-to is a nicety, never a requirement
  }
}

/** Reads and clears the stash; invalid values resolve to null. */
export function popReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    if (!value || !isSafePath(value)) return null;
    return value;
  } catch {
    return null;
  }
}
