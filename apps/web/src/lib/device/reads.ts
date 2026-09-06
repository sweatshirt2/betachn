import { and, eq, gte, lt } from 'drizzle-orm';
import { aggregateToday } from '@chorify/core/today';
import { expandRule, type ExpandableRule, type SchedulePattern } from '@chorify/core/schedule';
import { openBrowserDevice } from './openDevice';
import * as schema from '@chorify/local-db/schema';
import type { OccurrenceStatus, TodayPayload, TitledOccurrence } from '@/features/chores/chores.types';

/**
 * Device-mode reads (Phase A2): the device DB is the system of record for
 * offline-only households (D49), so reads never touch axios. Occurrence
 * materialization runs client-side (D64) through the SAME core rules the
 * server generator uses — expandRule + the mirrored (ruleId, dueDate) unique
 * index keep generation idempotent — and bucketing goes through the shared
 * pure aggregateToday (A0) so Today is byte-identical across modes.
 */

const DEVICE_TZ = 'Africa/Addis_Ababa';
const HORIZON_DAYS = 13; // §4.8 generator horizon

function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Materialize pending occurrences for [today-90, today+horizon] into the
 * device mirrors. Server pulls and local writes keep status authoritative —
 * materialization only inserts MISSING (ruleId, dueDate) pairs as pending
 * (upsert-on-conflict-do-nothing semantics via the unique index).
 */
async function materializeLocal(
  db: Exclude<Awaited<ReturnType<typeof openBrowserDevice>>, { db: null }>['db'],
  householdId: string,
  today: string,
): Promise<void> {
  // Device assignment_rules mirror the server table (§4.5): scoped through
  // responsibilities, not a household column — the device DB is
  // single-household by design.
  const rules = await db
    .select({
      id: schema.assignmentRules.id,
      responsibilityId: schema.assignmentRules.responsibilityId,
      pattern: schema.assignmentRules.pattern,
      interval: schema.assignmentRules.interval,
      daysOfWeek: schema.assignmentRules.daysOfWeek,
      anchorDate: schema.assignmentRules.anchorDate,
      monthDay: schema.assignmentRules.monthDay,
      dates: schema.assignmentRules.dates,
      startDate: schema.assignmentRules.startDate,
      endDate: schema.assignmentRules.endDate,
      rotation: schema.assignmentRules.rotation,
      personIds: schema.assignmentRules.personIds,
    })
    .from(schema.assignmentRules)
    .innerJoin(
      schema.responsibilities,
      eq(schema.assignmentRules.responsibilityId, schema.responsibilities.id),
    )
    .where(
      and(
        eq(schema.responsibilities.householdId, householdId),
        eq(schema.assignmentRules.active, true),
      ),
    );
  if (rules.length === 0) return;

  const windowStart = addDaysIso(today, -90);
  const windowEnd = addDaysIso(today, HORIZON_DAYS);

  for (const rule of rules) {
    const expandable: ExpandableRule = {
      pattern: rule.pattern as SchedulePattern,
      interval: rule.interval,
      daysOfWeek: rule.daysOfWeek,
      anchorDate: rule.anchorDate,
      monthDay: rule.monthDay,
      dates: rule.dates,
      startDate: rule.startDate,
      endDate: rule.endDate,
      rotation: rule.rotation,
      personIds: rule.personIds,
    };
    for (const hit of expandRule(expandable, windowStart, windowEnd)) {
      // onConflictDoNothing on the mirrored (ruleId, dueDate) unique index —
      // reruns are no-ops; terminal rows are never resurrected here.
      await db
        .insert(schema.occurrences)
        .values({
          id: crypto.randomUUID(),
          householdId,
          responsibilityId: rule.responsibilityId,
          ruleId: rule.id,
          dueDate: hit.date,
          personIds: hit.personIds,
          status: 'pending',
        })
        .onConflictDoNothing({ target: [schema.occurrences.ruleId, schema.occurrences.dueDate] });
    }
  }
}

/**
 * Today screen payload for device-mode sessions — same shape as GET /api/v1/today.
 */
export async function deviceToday(): Promise<TodayPayload> {
  const device = await openBrowserDevice();
  if (device.db === null) {
    throw new Error('Offline storage is unavailable on this device.');
  }
  const db = device.db;

  const household = (await db.select().from(schema.households)).at(0);
  if (!household) throw new Error('No household on this device.');

  const today = todayIn(household.timezone || DEVICE_TZ);

  await materializeLocal(db, household.id, today);

  const [responsibilities, rules, occurrences, supplies, shoppingItems, assets, serviceRecords, activityEvents] =
    await Promise.all([
      db.select().from(schema.responsibilities).where(eq(schema.responsibilities.householdId, household.id)),
      db
        .select({
          id: schema.assignmentRules.id,
          pattern: schema.assignmentRules.pattern,
          interval: schema.assignmentRules.interval,
        })
        .from(schema.assignmentRules)
        .innerJoin(
          schema.responsibilities,
          eq(schema.assignmentRules.responsibilityId, schema.responsibilities.id),
        )
        .where(eq(schema.responsibilities.householdId, household.id)),
      db
        .select()
        .from(schema.occurrences)
        .where(
          and(
            eq(schema.occurrences.householdId, household.id),
            gte(schema.occurrences.dueDate, addDaysIso(today, -90)),
            lt(schema.occurrences.dueDate, addDaysIso(today, HORIZON_DAYS + 1)),
          ),
        ),
      db.select().from(schema.supplies).where(eq(schema.supplies.householdId, household.id)),
      db.select().from(schema.shoppingItems).where(eq(schema.shoppingItems.householdId, household.id)),
      db.select().from(schema.assets).where(eq(schema.assets.householdId, household.id)),
      // service_records mirror has no household column (§4.5) — the device DB
      // is single-household by design, so an unscoped read is complete.
      db.select().from(schema.serviceRecords),
      db.select().from(schema.activityEvents),
    ]);

  const schedules: Record<string, { pattern: SchedulePattern; interval: number | null }> = {};
  for (const rule of rules) {
    schedules[rule.id] = { pattern: rule.pattern as SchedulePattern, interval: rule.interval };
  }

  const titles = new Map(responsibilities.map((r) => [r.id, r.title] as const));
  const titled = (rows: typeof occurrences): TitledOccurrence[] =>
    rows.map((o) => ({
      id: o.id,
      responsibilityId: o.responsibilityId,
      ruleId: o.ruleId,
      dueDate: o.dueDate,
      personIds: o.personIds,
      status: o.status as OccurrenceStatus,
      completedByPersonId: o.completedByPersonId,
      title: titles.get(o.responsibilityId) ?? 'Chore',
    }));

  const aggregate = aggregateToday({
    today,
    occurrences: titled(occurrences),
    schedules,
    responsibilities: responsibilities.map((r) => ({ id: r.id, title: r.title })),
    supplies: supplies.map((s) => ({ id: s.id, name: s.name, state: s.state })),
    shoppingItems: shoppingItems.map((i) => ({ id: i.id, name: i.name, purchasedAt: i.purchasedAt })),
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      maintenanceIntervalDays: a.maintenanceIntervalDays,
    })),
    serviceRecords: serviceRecords.map((r) => ({ assetId: r.assetId, servicedOn: r.servicedOn })),
    recentActivity: activityEvents
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 5)
      .map((e) => ({ type: e.type, payload: e.payload })),
  });

  return {
    todayOccurrences: aggregate.todayOccurrences,
    missedInGrace: aggregate.missedInGrace,
    upcoming: aggregate.upcoming,
    lowSupplies: aggregate.lowSupplies,
    openShoppingItems: aggregate.openShoppingItems as TodayPayload['openShoppingItems'],
    maintenanceDue: aggregate.maintenanceDue,
    recentActivity: aggregate.recentActivity as TodayPayload['recentActivity'],
    completedThisWeek: aggregate.completedThisWeek,
  };
}
