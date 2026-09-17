'use client';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  SyncEngine,
  FlushScheduler,
  fetchSyncTransport,
  type SyncIdentity,
  type SchedulerTimers,
  type FlushResult,
} from '@chorify/local-db/sync-client';
import { runDeviceJobs } from '@chorify/local-db/jobs';
import { openBrowserDevice } from '@/lib/device/openDevice';
import { invalidateApiCache } from '@/lib/api/client';
import { evictSession } from '@/lib/auth/evictSession';
import { store, type RootState } from '@/store';
import { useSyncStatus, statusChanged, type SyncStatusState } from './syncStatus';

export { useSyncStatus };
export type { SyncStatusState };

/**
 * Device-mode identity from the RTK slice (§4.12): the engine flushes only
 * when the household has BOTH a server token and a claimed household code —
 * offline-only households stay purely local and never hit the network.
 */
function identityFromStore(): SyncIdentity {
  let mode: RootState['auth']['mode'] = 'server';
  let token: string | null = null;
  let code: string | null = null;
  let householdId: string | null = null;
  let personId: string | null = null;

  const read = () => {
    const auth = store.getState().auth;
    mode = auth.mode;
    token = auth.token;
    code = auth.household?.code ?? null;
    householdId = auth.household?.id ?? null;
    personId = auth.activePerson?.id ?? null;
  };
  read();

  return {
    token: () => {
      read();
      return mode === 'device' ? token : null;
    },
    householdCode: () => {
      read();
      return mode === 'device' ? code : null;
    },
    householdId: () => {
      read();
      return mode === 'device' ? householdId : null;
    },
    myPersonId: () => {
      read();
      return mode === 'device' ? personId : null;
    },
  };
}

/** DOM timers + browser events for the FlushScheduler. */
function domTimers(): SchedulerTimers {
  return {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
    addEventListener: (event, fn) => {
      if (event === 'visibilitychange') {
        document.addEventListener(event, fn);
      } else {
        window.addEventListener(event, fn);
      }
      return () => {
        if (event === 'visibilitychange') {
          document.removeEventListener(event, fn);
        } else {
          window.removeEventListener(event, fn);
        }
      };
    },
  };
}

let enginePromise: Promise<SyncEngine | null> | null = null;
let stopScheduler: (() => void) | null = null;

/**
 * The web sync client (Phase A5) — lazily constructed against the memoized
 * device DB. A 401/403 during push leaves pending_ops intact: the next
 * registered session flushes them (the engine only ack-clears on success).
 */
function getEngine(): Promise<SyncEngine | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (enginePromise === null) {
    enginePromise = openBrowserDevice().then((device) => {
      if (device.db === null) return null;
      // D67 edge cast: the engine is typed against the node (sync) driver;
      // the browser proxy handle is the async twin with identical call sites.
      type EngineCtor = ConstructorParameters<typeof SyncEngine>;
      const engine = new SyncEngine(
        device.db as unknown as EngineCtor[0],
        fetchSyncTransport(),
        identityFromStore(),
      );
      // Instrument flush so scheduler-driven runs (30s tick, focus, online —
      // whose errors the FlushScheduler swallows for retry) still surface a
      // 401 to the eviction path. This is the app-edge DIP seam; the pure
      // package stays transport- and store-agnostic.
      const rawFlush = engine.flush.bind(engine);
      engine.flush = async () => {
        try {
          return await rawFlush();
        } catch (err) {
          handleFlushError(err);
          throw err;
        }
      };
      return engine;
    });
  }
  return enginePromise;
}

/**
 * Post-flush UI refresh (Phase B1): a pull that applied remote changes must
 * invalidate TanStack caches or other devices' edits stay invisible until a
 * remount. Push-only flushes touch nothing remote — skip the refetch churn.
 */
function refreshAfterFlush(result: FlushResult | undefined): void {
  if (result === undefined) return;
  if (result.applied > 0 || result.rejected > 0) invalidateApiCache();
}

/**
 * Flush error triage: the transport throws the server error CODE as the
 * message (Chorify envelope) or `HTTP <status>` (foreign envelope — proxies,
 * deploy protection, HTML error pages). An expired Bearer during push/pull
 * must evict the session like any axios 401 (§5.8) — otherwise a stale token
 * wedges the device in endless "pending" sync with no path back to login.
 * Everything else (network hiccup, 5xx) stays a silent retry — pending_ops
 * are preserved.
 */
function handleFlushError(err: unknown): void {
  if (!(err instanceof Error)) return;
  if (err.message === 'UNAUTHENTICATED' || err.message === 'HTTP 401') evictSession();
}

/**
 * Schedule a flush after a device mutation lands (write-ack trigger, §4.12).
 * Fire-and-forget by design — mutations never block on the network.
 */
export function scheduleSyncFlush(): void {
  if (store.getState().auth.mode !== 'device') return;
  void getEngine()
    .then((engine) => {
      if (engine === null) return;
      if (stopScheduler === null) {
        stopScheduler = new FlushScheduler(engine, domTimers()).start();
      }
      return engine.flush().catch((err) => {
        handleFlushError(err);
        return undefined;
      });
    })
    .then(refreshAfterFlush)
    .finally(() => statusChanged());
}

/** Manual trigger (Settings "Sync now") + tests. */
export async function flushNow(): Promise<FlushResult | null> {
  if (store.getState().auth.mode !== 'device') return null;
  const engine = await getEngine();
  if (engine === null) return null;
  const result = await engine.flush().catch((err) => {
    handleFlushError(err);
    return null;
  });
  refreshAfterFlush(result ?? undefined);
  statusChanged();
  return result;
}

/** Dev/tests: tear down the singleton. */
export function stopSyncClient(): void {
  stopScheduler?.();
  stopScheduler = null;
  enginePromise = null;
}

/**
 * Mount-once boot hook (Providers): verifies the device DB is reachable,
 * runs the D64 client jobs (missed-sweep + due-today digest — server jobs
 * never see device rows, §6.35), and schedules the first flush. The
 * scheduler's own online/focus/visibility/30s triggers take over from there.
 */
export function useSyncBoot(): void {
  const mode = useSelector((state: RootState) => state.auth.mode);
  const token = useSelector((state: RootState) => state.auth.token);
  const householdId = useSelector((state: RootState) => state.auth.household?.id);

  useEffect(() => {
    if (mode !== 'device' || householdId === undefined) return;
    void (async () => {
      try {
        const device = await openBrowserDevice();
        if (device.db === null) return;
        await runDeviceJobs(
          device.db as unknown as Parameters<typeof runDeviceJobs>[0],
          householdId,
        );
      } catch {
        // Jobs are best-effort — the next app open retries.
      }
      scheduleSyncFlush();
    })();
  }, [mode, token, householdId]);

  useEffect(() => stopSyncClient, []);
}
