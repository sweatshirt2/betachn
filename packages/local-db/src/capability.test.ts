import { describe, expect, it } from 'vitest';
import { detectCapability, staleBannerState } from './capability';

describe('capability ladder (§4.12)', () => {
  it('requires worker + OPFS sync handles for the fast path', () => {
    expect(
      detectCapability({ hasWorker: true, hasStorageGetDirectory: true, hasSyncAccessHandle: true }),
    ).toBe('opfs');
    expect(
      detectCapability({ hasWorker: false, hasStorageGetDirectory: true, hasSyncAccessHandle: true }),
    ).toBe('online-only');
    expect(
      detectCapability({ hasWorker: true, hasStorageGetDirectory: false, hasSyncAccessHandle: true }),
    ).toBe('online-only');
    expect(
      detectCapability({ hasWorker: true, hasStorageGetDirectory: true, hasSyncAccessHandle: false }),
    ).toBe('online-only');
  });
});

describe('stale-offline banner (D65 / §6.36)', () => {
  const now = new Date('2026-08-26T12:00:00Z');
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

  it('fresh within all thresholds', () => {
    expect(staleBannerState({ lastSuccessfulSyncAt: hoursAgo(1), pendingCount: 0 }, now).level).toBe('fresh');
  });

  it('warn at ≥48h or ≥25 pending ops', () => {
    expect(staleBannerState({ lastSuccessfulSyncAt: hoursAgo(49), pendingCount: 0 }, now).level).toBe('warn');
    expect(staleBannerState({ lastSuccessfulSyncAt: hoursAgo(1), pendingCount: 25 }, now).level).toBe('warn');
    const state = staleBannerState({ lastSuccessfulSyncAt: hoursAgo(49), pendingCount: 25 }, now);
    expect(state.reasonKeys).toEqual(['lastSyncOld', 'pendingOps']);
  });

  it('strong at ≥14 days or ≥80 ops', () => {
    expect(staleBannerState({ lastSuccessfulSyncAt: hoursAgo(14 * 24 + 1), pendingCount: 0 }, now).level).toBe('strong');
    expect(staleBannerState({ lastSuccessfulSyncAt: hoursAgo(1), pendingCount: 80 }, now).level).toBe('strong');
  });

  it('resync heads-up at ≥60 days', () => {
    expect(staleBannerState({ lastSuccessfulSyncAt: hoursAgo(60 * 24), pendingCount: 0 }, now).level).toBe('resync');
  });

  it('never-synced devices: offline-only fresh; synced-with-ops maximally stale', () => {
    expect(staleBannerState({ lastSuccessfulSyncAt: null, pendingCount: 0 }, now).level).toBe('fresh');
    expect(staleBannerState({ lastSuccessfulSyncAt: null, pendingCount: 3 }, now).level).toBe('strong');
  });
});
