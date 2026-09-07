'use client';

import { useEffect, useState } from 'react';
import { pendingOps, deviceSyncState } from '@chorify/local-db/schema';
import { staleBannerState, type StaleBannerState } from '@chorify/local-db/capability';
import { requireDeviceDb } from '@/lib/device/writes';
import { store } from '@/store';
import { emitStatusChanged, notifyStatusListeners } from './statusBus';

export type { StaleBannerState };

export interface SyncStatusState {
  pendingCount: number;
  lastSuccessfulSyncAt: string | null;
  banner: StaleBannerState;
}

/**
 * Live device-sync status for the SyncStatus chip + stale-offline banner
 * (D65): pending-op count + last successful sync age from device_sync_state,
 * polled on a 5s cadence and immediately after every flush via the status
 * bus. Device-mode only — deviceless renders use the `fresh` state.
 */
export function useSyncStatus(): SyncStatusState {
  const [status, setStatus] = useState<SyncStatusState>({
    pendingCount: 0,
    lastSuccessfulSyncAt: null,
    banner: { level: 'fresh', reasonKeys: [] },
  });

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      // Server sessions have no device store of record — never open the
      // worker just to poll status.
      if (store.getState().auth.mode !== 'device') return;
      try {
        const db = await requireDeviceDb();
        const ops = await db.select({ uuid: pendingOps.uuid }).from(pendingOps);
        const state = (await db.select().from(deviceSyncState)).at(0) ?? null;
        if (!alive) return;
        const lastSuccessfulSyncAt = state?.lastSuccessfulSyncAt ?? null;
        setStatus({
          pendingCount: ops.length,
          lastSuccessfulSyncAt,
          banner: staleBannerState(
            { lastSuccessfulSyncAt, pendingCount: ops.length },
            new Date(),
          ),
        });
      } catch {
        // Deviceless (SSR, online-only capability): stay fresh; the shell
        // hides sync chrome for server sessions anyway.
      }
    }

    void poll();
    timer = setInterval(() => void poll(), 5_000);
    const unlisten = notifyStatusListeners(() => void poll());
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      unlisten();
    };
  }, []);

  return status;
}

/** Fired by the sync client after every flush attempt. */
export function statusChanged(): void {
  emitStatusChanged();
}
