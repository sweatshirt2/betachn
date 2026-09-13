import type PgBoss from 'pg-boss';
import { lt } from 'drizzle-orm';
import {
  db,
  householdChanges,
  jobsAudit,
  nodeRandomSource,
  pgBlocklistChecker,
  pgUnitOfWork,
  systemClock,
} from '@chorify/db';
import {
  HouseholdsService,
  OccurrencesService,
  ResponsibilitiesService,
  SocialService,
  isoTodayInTz,
  ownerHolderPersonIds,
} from '@chorify/core';

/**
 * Force-runnable job handlers (§4.9) + pg-boss wiring. Handlers run through
 * the SAME core services as the routes — the worker adds fan-out, digest
 * composition and retention pruning only. Day boundaries compute in each
 * household's timezone (§6.8) via core isoTodayInTz.
 */

const uow = pgUnitOfWork(db);
const householdsService = new HouseholdsService(uow, nodeRandomSource, pgBlocklistChecker(db));
const occurrencesService = new OccurrencesService(uow, systemClock);
const responsibilitiesService = new ResponsibilitiesService(uow, systemClock);
const socialService = new SocialService(uow, systemClock);

async function generateOccurrences(): Promise<Record<string, unknown>> {
  const ids = await householdsService.listIds();
  let materialized = 0;
  for (const id of ids) materialized += await occurrencesService.materializeHousehold(id);
  return { households: ids.length, materialized };
}

async function sweepMissed(): Promise<Record<string, unknown>> {
  const ids = await householdsService.listIds();
  let swept = 0;
  for (const id of ids) swept += await occurrencesService.sweepMissed(id);
  return { households: ids.length, swept };
}

/** ONE digest notification per person per day (§4.10/D11). */
async function dueTodayReminders(): Promise<Record<string, unknown>> {
  const now = systemClock.now();
  const ids = await householdsService.listIds();
  let digests = 0;
  for (const householdId of ids) {
    // §6.8: "due today" is the household's local day, not the server's UTC day.
    const household = await householdsService.get(householdId);
    const today = isoTodayInTz(household.timezone, now);
    const [dueToday, responsibilities] = await Promise.all([
      occurrencesService.listRange(householdId, { from: today, to: today, status: 'pending' }),
      responsibilitiesService.list(householdId),
    ]);
    const titles = new Map(responsibilities.map((r) => [r.id, r.title] as const));
    const byPerson = new Map<string, string[]>();
    for (const occurrence of dueToday) {
      const title = titles.get(occurrence.responsibilityId) ?? 'Chore';
      for (const personId of occurrence.personIds) {
        const list = byPerson.get(personId) ?? [];
        list.push(title);
        byPerson.set(personId, list);
      }
    }
    for (const [personId, personTitles] of byPerson) {
      const prefs = await socialService.getPrefs(personId);
      if (prefs.categories['reminder'] === false) continue;
      await socialService.notify({
        householdId,
        recipientPersonId: personId,
        category: 'reminder',
        type: 'notify.reminder.digest',
        paramsJson: { count: personTitles.length, previewTitles: personTitles.slice(0, 3) },
        linkPath: '/chores',
      });
      digests++;
    }
  }
  return { households: ids.length, digests };
}

/** lastExportAt null or >14d → backup notification to owner holders (§4.9). */
async function backupNudge(): Promise<Record<string, unknown>> {
  const ids = await householdsService.listIds();
  const cutoff = systemClock.now().getTime() - 14 * 86_400_000;
  let nudged = 0;
  for (const householdId of ids) {
    const household = await householdsService.get(householdId);
    const lastExport = household.lastExportAt ? new Date(household.lastExportAt).getTime() : null;
    if (lastExport !== null && lastExport >= cutoff) continue;
    const owners = await ownerHolderPersonIds(uow.exec, householdId);
    for (const personId of owners) {
      await socialService.notify({
        householdId,
        recipientPersonId: personId,
        category: 'backup',
        type: 'notify.backup.nudge',
        paramsJson: { householdName: household.name },
        linkPath: '/settings',
      });
      nudged++;
    }
  }
  return { households: ids.length, nudged };
}

/** Feed retention ≥90d — older changes prune; stale devices bootstrap (§6.30). */
async function pruneChanges(): Promise<Record<string, unknown>> {
  const cutoff = new Date(systemClock.now().getTime() - 90 * 86_400_000);
  const deleted = await db
    .delete(householdChanges)
    .where(lt(householdChanges.createdAt, cutoff))
    .returning({ id: householdChanges.id });
  return { pruned: deleted.length };
}

export type JobHandler = () => Promise<Record<string, unknown>>;

export const jobRegistry: Record<string, JobHandler> = {
  'generate-occurrences': generateOccurrences,
  'sweep-missed': sweepMissed,
  'due-today-reminders': dueTodayReminders,
  'backup-nudge': backupNudge,
  'prune-changes': pruneChanges,
};

/**
 * Cron cadences (D99): user actions materialize/regenerate occurrences
 * transactionally, so the generator cron is a backfill safety net, not the
 * delivery path — every 4h suffices. Hourly jobs sit on hour boundaries
 * (minute 0) so a keep-alive wake shortly before the hour leaves the full
 * 15-min window for the tick; off-boundary minutes would fire while the
 * worker can already be asleep again (pg-boss crons skip missed ticks —
 * no catch-up on wake).
 */
export async function registerJobs(boss: PgBoss): Promise<void> {
  for (const [name, handler] of Object.entries(jobRegistry)) {
    await boss.createQueue(name);
    await boss.work(name, async () => {
      try {
        const result = await handler();
        await db.insert(jobsAudit).values({ name, result });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db.insert(jobsAudit).values({ name, result: { error: message } });
        throw err;
      }
    });
  }
  await boss.schedule('generate-occurrences', '0 */4 * * *');
  await boss.schedule('sweep-missed', '0 * * * *');
  await boss.schedule('due-today-reminders', '0 7 * * *', undefined, {
    tz: 'Africa/Addis_Ababa',
  });
  await boss.schedule('backup-nudge', '0 18 * * 0', undefined, { tz: 'Africa/Addis_Ababa' });
  await boss.schedule('prune-changes', '0 3 * * *');
}
