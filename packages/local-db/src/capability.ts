/**
 * §4.12 capability ladder: OPFS (sync access handles, worker context) →
 * in-memory session persistence → online-only mode. Proxy mini-browsers get
 * 'online-only' and the UI shows the "use Chrome" hint (§4.12).
 */

export type DeviceCapability = 'opfs' | 'memory' | 'online-only';

/** Detection inputs, injectable so tests never touch a real browser. */
export interface CapabilityEnvironment {
  hasWorker: boolean;
  hasStorageGetDirectory: boolean;
  hasSyncAccessHandle: boolean;
}

export function detectCapability(env: CapabilityEnvironment): DeviceCapability {
  if (!env.hasWorker || !env.hasStorageGetDirectory || !env.hasSyncAccessHandle) {
    return 'online-only';
  }
  return 'opfs';
}

/** Real-browser probe — every global touched via typeof, never imported. */
export function detectBrowserCapability(): DeviceCapability {
  const env: CapabilityEnvironment = {
    hasWorker: typeof Worker !== 'undefined',
    hasStorageGetDirectory:
      typeof navigator !== 'undefined' &&
      navigator.storage !== undefined &&
      typeof navigator.storage.getDirectory === 'function',
    hasSyncAccessHandle:
      typeof FileSystemFileHandle !== 'undefined' &&
      // Runtime probe: TS DOM types lag the API; `in` avoids constructing one
      typeof (FileSystemFileHandle.prototype as { createSyncAccessHandle?: unknown })
        .createSyncAccessHandle === 'function',
  };
  return detectCapability(env);
}

export interface StaleBannerState {
  level: 'fresh' | 'warn' | 'strong' | 'resync';
  /** Human-facing reason keys for the banner (i18n, never prose). */
  reasonKeys: Array<'lastSyncOld' | 'pendingOps'>;
}

/** D65 thresholds (§6.36) — tunable constants. */
export const STALE_THRESHOLDS = {
  warnHours: 48,
  warnOps: 25,
  strongDays: 14,
  strongOps: 80,
  resyncDays: 60,
} as const;

/**
 * Stale-offline banner state machine (D65): driven by lastSuccessfulSyncAt +
 * pending count. Threshold precedence resync > strong > warn > fresh.
 * Null lastSuccessfulSyncAt means NEVER synced: an offline-only household is
 * perfectly fresh; a synced household still holding ops is maximally stale.
 */
export function staleBannerState(
  input: { lastSuccessfulSyncAt: string | null; pendingCount: number },
  now: Date,
): StaleBannerState {
  const { lastSuccessfulSyncAt, pendingCount } = input;

  const ageHours =
    lastSuccessfulSyncAt === null
      ? null
      : (now.getTime() - new Date(lastSuccessfulSyncAt).getTime()) / 3_600_000;

  if (ageHours === null && pendingCount === 0) return { level: 'fresh', reasonKeys: [] };
  // Registered but NEVER sync-completed while holding ops: nothing on the
  // server mirrors yet — maximally stale regardless of op count.
  if (ageHours === null) return { level: 'strong', reasonKeys: ['lastSyncOld'] };

  if (ageHours !== null && ageHours >= STALE_THRESHOLDS.resyncDays * 24) {
    return { level: 'resync', reasonKeys: ['lastSyncOld'] };
  }
  if (
    (ageHours !== null && ageHours >= STALE_THRESHOLDS.strongDays * 24) ||
    pendingCount >= STALE_THRESHOLDS.strongOps
  ) {
    const reasonKeys: StaleBannerState['reasonKeys'] = [];
    if (ageHours !== null && ageHours >= STALE_THRESHOLDS.strongDays * 24) reasonKeys.push('lastSyncOld');
    if (pendingCount >= STALE_THRESHOLDS.strongOps) reasonKeys.push('pendingOps');
    return { level: 'strong', reasonKeys };
  }
  if (
    (ageHours !== null && ageHours >= STALE_THRESHOLDS.warnHours) ||
    pendingCount >= STALE_THRESHOLDS.warnOps
  ) {
    const reasonKeys: StaleBannerState['reasonKeys'] = [];
    if (ageHours !== null && ageHours >= STALE_THRESHOLDS.warnHours) reasonKeys.push('lastSyncOld');
    if (pendingCount >= STALE_THRESHOLDS.warnOps) reasonKeys.push('pendingOps');
    return { level: 'warn', reasonKeys };
  }
  return { level: 'fresh', reasonKeys: [] };
}
