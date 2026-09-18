import { eq } from "drizzle-orm";
import * as schema from "@chorify/local-db/schema";
import { openBrowserDevice } from "./openDevice";

/**
 * First-comer guide flag (D114) — device-side persistence in
 * device_settings, the same store the D63 passcode gate uses.
 *
 * Per plan §16b: auto-plays ONCE on first signed-in load of a synced
 * household; device (offline-only) households skip — there is nothing
 * to teach yet. The flag lives on THIS device so a second device gets
 * its own first-comer tour (device settings are deliberately not a
 * server mirror, households.ts header rationale).
 *
 * All helpers fail-open: an unreadable store must never block the app.
 */

export const GUIDE_FLAG_KEY = "guide_seen_v1";

/** True when the guide has already been shown (or cannot be checked). */
export async function hasSeenGuide(): Promise<boolean> {
  try {
    const device = await openBrowserDevice();
    if (device.db === null) return true; // no store → never nag
    const row = await device.db
      .select()
      .from(schema.device_settings)
      .where(eq(schema.device_settings.key, GUIDE_FLAG_KEY))
      .limit(1);
    return row.length > 0;
  } catch {
    return true; // fail-open: never brick the app over a tour flag
  }
}

export async function markGuideSeen(): Promise<void> {
  try {
    const device = await openBrowserDevice();
    if (device.db === null) return;
    await device.db
      .insert(schema.device_settings)
      .values({ key: GUIDE_FLAG_KEY, value: true })
      .onConflictDoUpdate({
        target: schema.device_settings.key,
        set: { value: true, updatedAt: new Date().toISOString() },
      });
  } catch {
    // Memory tier or transient failure: worst case the tour replays next
    // session — acceptable, never an error surface.
  }
}

/** Clears the flag — the Settings "How this works" replay uses this. */
export async function resetGuideFlag(): Promise<boolean> {
  const device = await openBrowserDevice();
  if (device.db === null) return false;
  const prior = await hasSeenGuide();
  await device.db
    .delete(schema.device_settings)
    .where(eq(schema.device_settings.key, GUIDE_FLAG_KEY));
  return prior;
}
