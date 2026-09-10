import { and, eq, gte, lt } from 'drizzle-orm';
import { aggregateToday } from '@chorify/core/today';
import { expandRule, type ExpandableRule, type SchedulePattern } from '@chorify/core/schedule';
import { openBrowserDevice } from './openDevice';
import * as schema from '@chorify/local-db/schema';
import type { DeviceDb } from './createHousehold';
import type {
  OccurrenceStatus,
  ResponsibilityDetail,
  TodayPayload,
  TitledOccurrence,
} from '@/features/chores/chores.types';
import type { PersonPayload, RolePayload } from '@/features/household/household.types';
import type { ActivityEventPayload } from '@/features/activity/activity.types';
import type { NotificationPayload } from '@/features/notifications/notifications.types';
import type { RoutinePayload } from '@/features/routines/routines.types';
import type { RoomPayload, AssetPayload } from '@/features/home/home.types';
import type { SupplyPayload } from '@/features/supplies/supplies.types';
import type { ShoppingItemPayload } from '@/features/shopping/shopping.types';

/** Feature payload aliases — device reads return the EXACT wire shapes. */
type DevicePersonPayload = PersonPayload;
type DeviceRolePayload = RolePayload;
type DeviceActivityEvent = ActivityEventPayload;
type DeviceNotificationPayload = NotificationPayload;
type DeviceRoutinePayload = RoutinePayload;
type DeviceRoomPayload = RoomPayload;
type DeviceAssetPayload = AssetPayload;
type DeviceSupplyPayload = SupplyPayload;
type DeviceSupplyState = 'available' | 'low' | 'out';
type DeviceShoppingPayload = ShoppingItemPayload;

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

/** Household + viewer context shared by every device read. */
async function deviceContext(): Promise<DeviceDb> {
  const device = await openBrowserDevice();
  if (device.db === null) {
    throw new Error('Offline storage is unavailable on this device.');
  }
  const household = (await device.db.select().from(schema.households)).at(0);
  if (!household) throw new Error('No household on this device.');
  return device.db;
}

/**
 * Today screen payload for device-mode sessions — same shape as GET /api/v1/today.
 */
export async function deviceToday(): Promise<TodayPayload> {
  const db = await deviceContext();

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

// ————————————————————————————————————————————————
// Remaining device reads (Phase A4) — same shapes as the /api/v1 routes.
// ————————————————————————————————————————————————

/** Range list — twin of GET /api/v1/occurrences (?from&to&status&personId). */
export async function deviceOccurrences(filters: {
  from?: string;
  to?: string;
  status?: string;
  personId?: string;
} = {}): Promise<{ occurrences: TitledOccurrence[] }> {
  const db = await deviceContext();
  const household = (await db.select().from(schema.households)).at(0);
  if (!household) throw new Error('No household on this device.');
  const rows = await db
    .select()
    .from(schema.occurrences)
    .where(eq(schema.occurrences.householdId, household.id));
  const responsibilities = await db
    .select({ id: schema.responsibilities.id, title: schema.responsibilities.title })
    .from(schema.responsibilities);
  const titles = new Map(responsibilities.map((r) => [r.id, r.title] as const));
  let records = rows.map((o) => ({
    id: o.id,
    responsibilityId: o.responsibilityId,
    ruleId: o.ruleId,
    dueDate: o.dueDate,
    personIds: o.personIds as string[],
    status: o.status as OccurrenceStatus,
    completedByPersonId: o.completedByPersonId,
    title: titles.get(o.responsibilityId) ?? 'Chore',
  }));
  if (filters.from) records = records.filter((o) => o.dueDate >= filters.from!);
  if (filters.to) records = records.filter((o) => o.dueDate <= filters.to!);
  if (filters.status) records = records.filter((o) => o.status === filters.status);
  if (filters.personId) records = records.filter((o) => o.personIds.includes(filters.personId!));
  records.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  return { occurrences: records };
}

/** Chore detail — twin of GET /api/v1/responsibilities/:id. */
export async function deviceResponsibilityDetail(
  responsibilityId: string,
): Promise<ResponsibilityDetail> {
  const db = await deviceContext();
  const responsibility = await db.query.responsibilities!.findFirst({
    where: eq(schema.responsibilities.id, responsibilityId),
  });
  if (!responsibility) throw new Error('Responsibility not found');
  const [subtasks, rules] = await Promise.all([
    db.select().from(schema.subtasks).where(eq(schema.subtasks.responsibilityId, responsibilityId)),
    db
      .select()
      .from(schema.assignmentRules)
      .where(eq(schema.assignmentRules.responsibilityId, responsibilityId)),
  ]);
  return {
    responsibility: {
      id: responsibility.id,
      title: responsibility.title,
      notes: responsibility.notes,
      icon: responsibility.icon,
      routineId: responsibility.routineId,
    },
    subtasks: subtasks
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ id: s.id, title: s.title, assigneePersonId: s.assigneePersonId })),
    rules: rules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      interval: r.interval,
      daysOfWeek: (r.daysOfWeek ?? null) as number[] | null,
      anchorDate: r.anchorDate,
      monthDay: r.monthDay,
      dates: (r.dates ?? null) as string[] | null,
      startDate: r.startDate,
      endDate: r.endDate,
      rotation: (r.rotation ?? null) as { periodDays: number; personIds: string[] } | null,
      personIds: (r.personIds ?? []) as string[],
      active: r.active,
    })),
  };
}

/** People + roles for the household screens — twins of GET /profiles, GET /roles. */
export async function devicePeople(): Promise<DevicePersonPayload[]> {
  const db = await deviceContext();
  const rows = await db.select().from(schema.people);
  rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    avatarEmoji: p.avatarEmoji,
    roleId: p.roleId,
    phone: p.phone,
    permissionOverrides: (p.permissionOverrides ?? {}) as Record<string, boolean>,
  }));
}

export async function deviceRoles(): Promise<DeviceRolePayload[]> {
  const db = await deviceContext();
  const rows = await db.select().from(schema.roles);
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isOwnerRole: r.isOwnerRole,
    isBuiltin: r.isBuiltin,
    builtinKey: r.builtinKey,
    permissions: r.permissions as Record<string, boolean>,
  }));
}

/** Story feed — twin of GET /api/v1/activity (member/action filters, newest first). */
export async function deviceActivity(filters: {
  member?: string;
  action?: string;
}): Promise<{ events: DeviceActivityEvent[]; nextCursor: string | null }> {
  const db = await deviceContext();
  const rows = await db.select().from(schema.activityEvents);
  let events = rows.map((e) => ({
    id: e.id,
    type: e.type,
    payload: (e.payload ?? {}) as Record<string, unknown>,
    createdAt: e.createdAt,
    actorPersonId: e.actorPersonId,
  }));
  if (filters.member) events = events.filter((e) => e.actorPersonId === filters.member);
  if (filters.action) events = events.filter((e) => e.type === filters.action);
  events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const page = events.slice(0, 50);
  return {
    events: page.map(({ actorPersonId: _actor, ...event }) => event),
    nextCursor: events.length > 50 ? String(events.length) : null,
  };
}

/** Inbox — twin of GET /api/v1/notifications (?unread). */
export async function deviceNotifications(unreadOnly: boolean): Promise<{ notifications: DeviceNotificationPayload[] }> {
  const db = await deviceContext();
  const person = (await db.select().from(schema.people)).at(0) ?? null;
  const rows = await db.select().from(schema.notifications);
  const mine = person === null ? rows : rows.filter((n) => n.recipientPersonId === person.id);
  const mapped = mine.map((n) => ({
    id: n.id,
    category: n.category,
    type: n.type,
    paramsJson: (n.paramsJson ?? {}) as Record<string, unknown>,
    linkPath: n.linkPath,
    readAt: n.readAt,
  }));
  const filtered = unreadOnly ? mapped.filter((n) => n.readAt === null) : mapped;
  filtered.sort((a, b) => (a.id < b.id ? 1 : -1));
  return { notifications: filtered.slice(0, 100) }; // id (uuidv4) sort approximates newest-first
}

/** Preferences — twin of GET /api/v1/notifications/preferences. */
export async function deviceNotificationPrefs(): Promise<{
  preferences: { categories: Record<string, boolean> };
}> {
  const db = await deviceContext();
  const person = (await db.select().from(schema.people)).at(0) ?? null;
  if (person === null) return { preferences: { categories: {} } };
  const row = await db.query.notificationPrefs!.findFirst({
    where: eq(schema.notificationPrefs.personId, person.id),
  });
  return { preferences: { categories: (row?.categories ?? {}) as Record<string, boolean> } };
}

/** Routines / rooms / assets lists — twins of the ops GET routes. */
export async function deviceRoutines(): Promise<DeviceRoutinePayload[]> {
  const db = await deviceContext();
  const rows = await db.select().from(schema.routines);
  return rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon, timeBucket: r.timeBucket }));
}

export async function deviceRooms(): Promise<DeviceRoomPayload[]> {
  const db = await deviceContext();
  const rows = await db.select().from(schema.rooms);
  return rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon }));
}

export async function deviceAssets(): Promise<DeviceAssetPayload[]> {
  const db = await deviceContext();
  const rows = await db.select().from(schema.assets);
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
    roomId: a.roomId,
    maintenanceIntervalDays: a.maintenanceIntervalDays,
  }));
}

export async function deviceSupplies(): Promise<{ supplies: DeviceSupplyPayload[] }> {
  const db = await deviceContext();
  const rows = await db.select().from(schema.supplies);
  return {
    supplies: rows.map((s) => ({ id: s.id, name: s.name, state: s.state as DeviceSupplyState })),
  };
}

export async function deviceShoppingItems(): Promise<{ items: DeviceShoppingPayload[] }> {
  const db = await deviceContext();
  const rows = await db.select().from(schema.shoppingItems);
  return {
    items: rows.map((i) => ({
      id: i.id,
      name: i.name,
      purchasedAt: i.purchasedAt,
      quantityText: i.quantityText,
    })),
  };
}
