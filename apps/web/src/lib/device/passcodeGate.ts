import { eq } from 'drizzle-orm';
import { createGate, verifyGate, type PasscodeGate } from '@chorify/local-db/passcode';
import * as schema from '@chorify/local-db/schema';
import { openBrowserDevice } from './openDevice';

/**
 * Device passcode gate (D63) — device-side persistence over the crypto
 * primitives in @chorify/local-db/passcode.
 *
 * Design per plan §4.12:
 * - The gate row lives in the DEVICE DB (device_settings) — as durable as the
 *   data it protects, never just localStorage.
 * - Applies to BOTH modes: synced accounts get the recoverable gate-only
 *   hash; device/offline households get the same gate today (the optional
 *   AES-GCM at-rest envelope is a separate, later layer).
 * - "Recovery" for synced accounts = sign in online (which resets the gate
 *   row); offline households are warned at setup that forgetting the
 *   passcode means resetting the app (data loss) — copy lives in Settings.
 * - The MEMORY tier (session-scoped device DB) refuses to persist a gate: a
 *   passcode that vanishes on reload protects nothing. Callers surface this
 *   as the passcodeNeedsDurable copy.
 */

const GATE_KEY = 'passcode_gate';

/** Sentinel for the memory-tier refusal — Settings maps it to i18n copy. */
export class MemoryTierError extends Error {
  constructor() {
    super('durable device storage unavailable');
    this.name = 'MemoryTierError';
  }
}

export type PasscodeGateState =
  | { status: 'none' }
  | { status: 'gate'; hint: null }
  | { status: 'gate'; hint: string };

export async function readPasscodeGateState(): Promise<PasscodeGateState> {
  const device = await openBrowserDevice();
  if (device.db === null) return { status: 'none' };
  const row = await device.db
    .select()
    .from(schema.device_settings)
    .where(eq(schema.device_settings.key, GATE_KEY))
    .limit(1);
  const raw = row.at(0)?.value as { hash?: string; hint?: string } | undefined;
  if (!raw?.hash) return { status: 'none' };
  return { status: 'gate', hint: typeof raw.hint === 'string' ? raw.hint : null };
}

export async function setPasscodeGate(passcode: string, hint: string | null): Promise<void> {
  if (passcode.length < 4) throw new Error('Passcode must be at least 4 characters');
  const device = await openBrowserDevice();
  if (device.db === null) throw new Error('Device storage unavailable');
  if (device.capability === 'memory') throw new MemoryTierError();
  const gate: PasscodeGate = await createGate(passcode);
  await device.db
    .insert(schema.device_settings)
    .values({ key: GATE_KEY, value: { ...gate, hint } as unknown as string })
    .onConflictDoUpdate({
      target: schema.device_settings.key,
      set: { value: { ...gate, hint } as unknown as string },
    });
}

/** Verifies a candidate; also returns the stored hint on failure for the UI. */
export async function tryUnlock(passcode: string): Promise<{ ok: boolean; hint: string | null }> {
  const device = await openBrowserDevice();
  if (device.db === null) return { ok: true, hint: null };
  const row = await device.db
    .select()
    .from(schema.device_settings)
    .where(eq(schema.device_settings.key, GATE_KEY))
    .limit(1);
  const raw = row.at(0)?.value as { salt?: string; hash?: string; hint?: string } | undefined;
  if (!raw?.hash || !raw.salt) return { ok: true, hint: null };
  const ok = await verifyGate(passcode, { salt: raw.salt, hash: raw.hash });
  return { ok, hint: typeof raw.hint === 'string' ? raw.hint : null };
}

export async function clearPasscodeGate(): Promise<void> {
  const device = await openBrowserDevice();
  if (device.db === null) return;
  await device.db.delete(schema.device_settings).where(eq(schema.device_settings.key, GATE_KEY));
}
