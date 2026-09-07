/**
 * D64 client jobs (§4.12): offline-only households run missed-sweep and the
 * due-today digest LOCALLY on app open — server jobs only ever see synced
 * households' rows (§6.35). Device twins of apps/worker jobs.ts, written
 * against the mirror tables with the same semantics:
 *  - sweep: pending ∧ dueDate < today → missed + activity + notify
 *    (creator-else-owners recipients per §4.10 — resolved from mirrors)
 *  - digest: ONE notification per person per day (D11) with
 *    {count, previewTitles} params, prefs-gated on `reminder` (D68)
 * Idempotent: sweeping is a status flip (no pending ⇒ no-op); digests
 * dedupe on a per-person per-day marker row in notifications.
 */
import { and, eq, lt } from 'drizzle-orm';
// Client-safe subpath (D83): the pure §6.8 primitive lives in core — one
// implementation shared with the server, never a per-package copy.
import { isoTodayInTz } from '@chorify/core/schedule';
import type { DeviceDatabase } from './client';
import {
  activityEvents,
  notifications,
  notificationPrefs,
  occurrences,
  people,
  responsibilities,
  roles,
} from './schema';

export interface DeviceJobsResult {
  swept: number;
  digests: number;
}

function todayIso(timezone: string): string {
  return isoTodayInTz(timezone, new Date());
}

/**
 * Sweep stale pending occurrences to missed (§4.9 device twin). Returns the
 * count swept. Owner recipients = persons holding an isOwnerRole role, minus
 * nobody (no actor on a sweep) — mirrors the server's creator-else-owners
 * fallback with actor=null.
 */
export async function deviceSweepMissed(
  db: DeviceDatabase,
  householdId: string,
  timezone = 'Africa/Addis_Ababa',
): Promise<number> {
  const today = todayIso(timezone);
  const stale = await db
    .select()
    .from(occurrences)
    .where(
      and(
        eq(occurrences.householdId, householdId),
        eq(occurrences.status, 'pending'),
        lt(occurrences.dueDate, today),
      ),
    );
  if (stale.length === 0) return 0;

  const ownerIds = await ownerHolderIds(db, householdId);
  const nowIso = new Date().toISOString();

  for (const row of stale) {
    await db.update(occurrences).set({ status: 'missed' }).where(eq(occurrences.id, row.id));
    const title = await responsibilityTitle(db, row.responsibilityId);
    await db.insert(activityEvents).values({
      id: crypto.randomUUID(),
      householdId,
      actorPersonId: null,
      type: 'occurrence.missed',
      payload: { title },
      domain: 'responsibilities',
      createdAt: nowIso,
    });
    for (const recipientId of ownerIds) {
      await insertNotification(db, householdId, recipientId, 'missed', 'notify.missed.detected', {
        title,
      });
    }
  }
  return stale.length;
}

/**
 * Due-today digest (§4.10/D11 device twin): ONE per person per day, gated on
 * the `reminder` pref. Dedupe: a digest notification for the same person with
 * paramsJson.day == today suppresses a second send.
 */
export async function deviceDueTodayDigest(
  db: DeviceDatabase,
  householdId: string,
  timezone = 'Africa/Addis_Ababa',
): Promise<number> {
  const today = todayIso(timezone);
  const dueToday = await db
    .select()
    .from(occurrences)
    .where(
      and(
        eq(occurrences.householdId, householdId),
        eq(occurrences.dueDate, today),
        eq(occurrences.status, 'pending'),
      ),
    );

  const byPerson = new Map<string, string[]>();
  for (const occurrence of dueToday) {
    const title = await responsibilityTitle(db, occurrence.responsibilityId);
    const personIds = (occurrence.personIds as string[]) ?? [];
    for (const personId of personIds) {
      const list = byPerson.get(personId) ?? [];
      list.push(title);
      byPerson.set(personId, list);
    }
  }

  let digests = 0;
  for (const [personId, titles] of byPerson) {
    const prefsRows = await db
      .select()
      .from(notificationPrefs)
      .where(eq(notificationPrefs.personId, personId))
      .limit(1);
    const categories = (prefsRows[0]?.categories as Record<string, boolean> | null) ?? {};
    if (categories['reminder'] === false) continue;

    // D11 dedupe: one digest per person per day.
    const existing = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientPersonId, personId),
          eq(notifications.type, 'notify.reminder.digest'),
        ),
      );
    const alreadyToday = existing.some(
      (n) => (n.paramsJson as Record<string, unknown> | null)?.day === today,
    );
    if (alreadyToday) continue;

    await insertNotification(db, householdId, personId, 'reminder', 'notify.reminder.digest', {
      day: today,
      count: titles.length,
      previewTitles: titles.slice(0, 3),
    });
    digests++;
  }
  return digests;
}

/** Convenience: run both jobs (app-open trigger, §6.35). */
export async function runDeviceJobs(
  db: DeviceDatabase,
  householdId: string,
  timezone = 'Africa/Addis_Ababa',
): Promise<DeviceJobsResult> {
  const swept = await deviceSweepMissed(db, householdId, timezone);
  const digests = await deviceDueTodayDigest(db, householdId, timezone);
  return { swept, digests };
}

async function ownerHolderIds(db: DeviceDatabase, householdId: string): Promise<string[]> {
  const allRoles = await db.select().from(roles).where(eq(roles.householdId, householdId));
  const ownerRoleIds = new Set(allRoles.filter((r) => r.isOwnerRole).map((r) => r.id));
  const allPeople = await db.select().from(people).where(eq(people.householdId, householdId));
  return allPeople
    .filter((p) => (p.roleId ? ownerRoleIds.has(p.roleId) : false))
    .map((p) => p.id);
}

async function responsibilityTitle(db: DeviceDatabase, responsibilityId: string): Promise<string> {
  const rows = await db
    .select()
    .from(responsibilities)
    .where(eq(responsibilities.id, responsibilityId))
    .limit(1);
  return rows[0]?.title ?? '';
}

async function insertNotification(
  db: DeviceDatabase,
  householdId: string,
  recipientPersonId: string,
  category: 'assignment' | 'reminder' | 'completion' | 'missed' | 'finance' | 'bill' | 'backup',
  type: string,
  params: Record<string, unknown>,
): Promise<void> {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    householdId,
    recipientPersonId,
    category,
    type,
    paramsJson: params,
    linkPath: '/chores',
    createdAt: new Date().toISOString(),
  });
}
