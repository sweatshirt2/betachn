import { addDays, diffDays, type SchedulePattern } from '../../schedule';
import { isWithinGraceWindow } from './occurrences.helpers';

/**
 * Structural inputs — deliberately minimal so both the pg route handler and
 * device-mirror rows (local-db, Phase A) satisfy them without casts. Pure:
 * no I/O, no executor, no cross-module imports (client-safe per D83).
 */
export interface TodayOccurrenceInput {
  id: string;
  responsibilityId: string;
  ruleId: string;
  dueDate: string;
  status: string;
}

export interface TodaySupplyInput {
  id: string;
  name: string;
  state: string;
}

export interface TodayShoppingInput {
  id: string;
  /** ISO string (device mirrors) or Date (pg rows) — only null-ness is inspected. */
  purchasedAt: string | Date | null;
}

export interface TodayAssetInput {
  id: string;
  name: string;
  maintenanceIntervalDays: number | null;
}

export interface TodayServiceRecordInput {
  assetId: string;
  servicedOn: string;
}

export interface TodayScheduleInfo {
  pattern: SchedulePattern;
  interval: number | null;
}

export interface TodayAggregateOutput<TOcc extends TodayOccurrenceInput> {
  todayOccurrences: Array<TOcc & { title: string }>;
  missedInGrace: Array<TOcc & { title: string }>;
  upcoming: Array<TOcc & { title: string }>;
  lowSupplies: TodaySupplyInput[];
  openShoppingItems: TodayShoppingInput[];
  maintenanceDue: Array<{ assetId: string; assetName: string; nextDue: string }>;
  recentActivity: unknown[];
  completedThisWeek: number;
}

export interface TodayAggregateInput<TOcc extends TodayOccurrenceInput> {
  today: string;
  occurrences: TOcc[];
  schedules: Record<string, TodayScheduleInfo>;
  responsibilities: Array<{ id: string; title: string }>;
  supplies: TodaySupplyInput[];
  shoppingItems: TodayShoppingInput[];
  assets: TodayAssetInput[];
  serviceRecords: TodayServiceRecordInput[];
  recentActivity: unknown[];
}

const UPCOMING_CAP = 20;
const UPCOMING_DAYS = 7;

/**
 * Single-round-trip home screen shape (§4.14) computed over pre-fetched rows.
 * Day-boundary math in UTC ISO (§6.8): callers resolve `today` in household
 * timezone (server) or device locale (client) — this function stays date-pure.
 */
export function aggregateToday<TOcc extends TodayOccurrenceInput>(
  input: TodayAggregateInput<TOcc>,
): TodayAggregateOutput<TOcc> {
  const { today, occurrences, schedules, responsibilities } = input;

  const titles = new Map(responsibilities.map((r) => [r.id, r.title] as const));
  const withTitle = (o: TOcc): TOcc & { title: string } => ({
    ...o,
    title: titles.get(o.responsibilityId) ?? 'Chore',
  });

  const todayOccurrences = occurrences
    .filter((o) => o.dueDate === today && o.status === 'pending')
    .map(withTitle);

  const missedInGrace = occurrences
    .filter((o) => {
      if (o.status !== 'missed') return false;
      const schedule = schedules[o.ruleId];
      if (!schedule) return false; // unknown rule — never grace-display (matches route guard)
      return isWithinGraceWindow(schedule.pattern, schedule.interval, o.dueDate, today, diffDays);
    })
    .map(withTitle);

  const upcomingFrom = addDays(today, 1);
  const upcomingTo = addDays(today, UPCOMING_DAYS);
  const upcoming = occurrences
    .filter((o) => o.status === 'pending' && o.dueDate >= upcomingFrom && o.dueDate <= upcomingTo)
    .slice(0, UPCOMING_CAP)
    .map(withTitle);

  const lowSupplies = input.supplies.filter((s) => s.state === 'low' || s.state === 'out');
  const openShoppingItems = input.shoppingItems.filter((i) => i.purchasedAt === null).slice(0, UPCOMING_CAP);

  // Maintenance next-due = max(servicedOn) + intervalDays (§6 home rule;
  // inlined to keep this module import-clean and client-safe — ISO dates
  // sort lexicographically).
  const lastServicedByAsset = new Map<string, string>();
  for (const record of input.serviceRecords) {
    const known = lastServicedByAsset.get(record.assetId);
    if (known === undefined || record.servicedOn > known) lastServicedByAsset.set(record.assetId, record.servicedOn);
  }
  const horizon = addDays(today, UPCOMING_DAYS);
  const maintenanceDue: Array<{ assetId: string; assetName: string; nextDue: string }> = [];
  for (const asset of input.assets) {
    const last = lastServicedByAsset.get(asset.id);
    if (!asset.maintenanceIntervalDays || !last) continue;
    const nextDue = addDays(last, asset.maintenanceIntervalDays);
    if (nextDue <= horizon) maintenanceDue.push({ assetId: asset.id, assetName: asset.name, nextDue });
  }

  const weekAgo = addDays(today, -6);
  const completedThisWeek = occurrences.filter(
    (o) => o.status === 'completed' && o.dueDate >= weekAgo && o.dueDate <= today,
  ).length;

  return {
    todayOccurrences,
    missedInGrace,
    upcoming,
    lowSupplies,
    openShoppingItems,
    maintenanceDue,
    recentActivity: input.recentActivity,
    completedThisWeek,
  };
}
