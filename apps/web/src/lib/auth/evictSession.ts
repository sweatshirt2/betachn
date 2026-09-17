/**
 * Session eviction (§5.8 UNAUTHENTICATED behavior): the ONE purge path used
 * by both the axios 401 interceptor and the sync transport's 401 — reset the
 * RTK session, clear TanStack caches, wipe every persisted browser artifact
 * of the session, and land on /login. Idempotent: repeated 401s (parallel
 * queries, the 30s sync tick) must not stack redirects.
 *
 * Deep-clean scope (hardened after the Vercel 401 incident): a stale session
 * must not survive ANY persistence layer —
 *  - redux-persist (`persist:chorify-auth` in localStorage): resetSession()
 *    re-persists the cleared slice, but the explicit removal guarantees the
 *    dead token is gone even if the persist write races the redirect.
 *  - sessionStorage entry marker: the D63 entry-ok flag outlives nothing —
 *    a fresh post-eviction boot re-asks the passcode gate.
 *  - Cache Storage + service worker: the offline shell (§4.13) caches app
 *    documents; a cached shell booted after eviction would resurrect the old
 *    UI against the dead token before the interceptor can react. Caches are
 *    dropped and the SW unregistered; the next Providers mount re-registers
 *    and rebuilds them — self-healing, one cold load of cost.
 * Deliberately KEPT: remembered-login conveniences (household code, last
 * usernames — never credentials, D101) and the device DB (a 401 in server
 * mode says nothing about offline households; wiping it would be data loss).
 */
import { resetSession, store } from '@/store';
import { isAuthPath, stashReturnTo } from './returnTo';

/** Same marker Shell.tsx sets when the D63 entry gate is satisfied. */
export const ENTRY_OK_KEY = 'chorify-entry-ok';

/** redux-persist key for the auth slice (store.ts persistReducer config). */
const PERSIST_AUTH_KEY = 'persist:chorify-auth';

let evicting = false;

export function evictSession(): void {
  if (typeof window === 'undefined') return;
  if (store.getState().auth.token === null && store.getState().auth.mode !== 'device') return; // already signed out
  store.dispatch(resetSession());
  purgeBrowserSessionArtifacts();
  if (queryClientClear !== null) queryClientClear();
  const { pathname, search } = window.location;
  if (!isAuthPath(pathname)) stashReturnTo(pathname, search);
  if (!isAuthPath(pathname)) {
    if (evicting) return;
    evicting = true;
    window.location.assign('/login');
    setTimeout(() => {
      evicting = false;
    }, 1000);
  }
}

/**
 * Wipe every persistence layer a dead session could hide in. Best-effort by
 * design: storage access can throw (private mode, quota, SW unavailable) and
 * the eviction redirect must never be blocked by cleanup failures.
 */
function purgeBrowserSessionArtifacts(): void {
  try {
    localStorage.removeItem(PERSIST_AUTH_KEY);
  } catch {
    // private-mode etc. — resetSession() already cleared the in-memory slice
  }
  try {
    sessionStorage.removeItem(ENTRY_OK_KEY);
  } catch {
    // as above
  }
  void purgeServiceWorkerArtifacts();
}

/** Drop every app cache + unregister the SW; rebuilt on the next boot. */
async function purgeServiceWorkerArtifacts(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Cache Storage unavailable (older browser / disabled) — ignore
  }
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // SW API unavailable — nothing to clean
  }
}

let queryClientClear: (() => void) | null = null;
/** Registered once by lib/api — keeps this module decoupled from TanStack. */
export function setQueryClientClearForEvict(clear: (() => void) | null): void {
  queryClientClear = clear;
}
