/**
 * §4.12 capability ladder: OPFS (sync access handles, worker context) →
 * in-memory session tier → none. The WORKER is the authority: it attempts
 * OPFS and falls back to `:memory:` inside its bootstrap (see the web app's
 * device.worker.ts); this module stays the pure model — the ladder type and
 * the injectable decision function its tests pin.
 */

export type DeviceCapability = 'opfs' | 'memory' | 'none';

/** Detection inputs, injectable so tests never touch a real browser. */
export interface CapabilityEnvironment {
  opfsInstallSucceeded: boolean;
}

export function detectCapability(env: CapabilityEnvironment): DeviceCapability {
  return env.opfsInstallSucceeded ? 'opfs' : 'memory';
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
