import type PgBoss from 'pg-boss';
import { and, eq, isNull, lt } from 'drizzle-orm';
import {
  db,
  householdChanges,
  jobsAudit,
  nodeRandomSource,
  pgBlocklistChecker,
  pgUnitOfWork,
  recurringShoppingItems,
  shoppingItems as shoppingItemsTable,
  systemClock,
} from '@chorify/db';
import {
  HouseholdsService,
  OccurrencesService,
  ResponsibilitiesService,
  SocialService,
  computeRecurringState,
  isoTodayInTz,
  ownerHolderPersonIds,
  resolveRecipients,
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

/**
 * Recurring buy reminder sweep (§4A.3 / D108) — runs in the 04:00 UTC window
 * (heartbeat-covered, D99/D100). Pure state machine computes due/overdue;
 * shopping_items and supplies tables live in this same db, so the open-item
 * dedup and purchase-recency reads are plain drizzle. Fires ONE
 * `shopping.recurringDue` notification per due reminder per sweep — creator
 * first, then manage_shopping holders (minus actor; the sweep has no actor).
 */
async function recurringReminders(): Promise<Record<string, unknown>> {
  const now = systemClock.now();
  const householdIds = await householdsService.listIds();
  let fired = 0;
  for (const householdId of householdIds) {
    const rows = await db
      .select()
      .from(recurringShoppingItems)
      .where(
        and(
          eq(recurringShoppingItems.householdId, householdId),
          isNull(recurringShoppingItems.archivedAt),
        ),
      );
    for (const row of rows) {
      const item = {
        intervalDays: row.intervalDays,
        lastPurchaseAt: row.lastPurchaseAt ? new Date(row.lastPurchaseAt) : null,
        snoozedUntil: row.snoozedUntil ? new Date(row.snoozedUntil) : null,
        state: row.state,
      };
      // Dedup (D108): an OPEN (unpurchased) list item for this supply/name
      // renders the reminder as "on the list" — never notify on top of it.
      const openListItems = (await db.query.shoppingItems!.findMany({
        where: and(
          eq(shoppingItemsTable.householdId, householdId),
          isNull(shoppingItemsTable.purchasedAt),
        ),
      })) as Array<{ name: string; sourceSupplyId: string | null }>;
      const openMatch = openListItems.some(
        (li) =>
          (row.supplyId !== null && li.sourceSupplyId === row.supplyId) ||
          li.name.toLowerCase() === row.name.toLowerCase(),
      );
      if (computeRecurringState(item, now, openMatch) !== 'due') continue;
      // D108: creator + manage_shopping holders. The worker resolves holders
      // via the people/permission kernel (owner holders superset — manage_
      // shopping gate re-checked per-recipient through prefs and UI gating).
      const owners = await ownerHolderPersonIds(uow.exec, householdId);
      const recipients = resolveRecipients('recurringDue', {
        ruleCreatorPersonId: row.createdByPersonId,
        supplyManagerPersonIds: owners,
      });
      for (const personId of recipients) {
        const prefs = await socialService.getPrefs(personId);
        if (prefs.categories['reminder'] === false) continue;
        await socialService.notify({
          householdId,
          recipientPersonId: personId,
          category: 'reminder',
          type: 'notify.recurring.due',
          paramsJson: { itemName: row.name, intervalDays: row.intervalDays },
          linkPath: '/pantry',
        });
        fired++;
      }
    }
  }
  return { households: householdIds.length, fired };
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
  'recurring-reminders': recurringReminders,
  'backup-nudge': backupNudge,
  'prune-changes': pruneChanges,
};

/**
 * Cron cadences (D99/D100): user actions materialize/regenerate occurrences
 * transactionally, so the generator cron is a backfill safety net, not the
 * delivery path — every 4h suffices. Every scheduled job sits on a minute
 * covered by the external 4-hourly keep-alive wake (:50 UTC grid — D100):
 * generate + prune ride the 03:50→04:05 window (digest 04:00 UTC included),
 * backup rides the 15:50→16:05 window. pg-boss crons skip missed ticks —
 * no catch-up on wake — so uncovered minutes may silently skip.
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
  // §4A.3: reminder sweep inside the same 04:00 UTC heartbeat window.
  await boss.schedule('recurring-reminders', '5 4 * * *');
  await boss.schedule('backup-nudge', '0 19 * * 0', undefined, { tz: 'Africa/Addis_Ababa' });
  await boss.schedule('prune-changes', '0 4 * * *');
}
