import { eq } from 'drizzle-orm';
import { buildActivity, type ActivityType } from '@chorify/core/activity';
import type { RuleInput } from '@chorify/core';
import { AppError } from '@chorify/core/errors';
import { KIND_CATEGORY, filterByPrefs, resolveRecipients, type NotifyKind } from '@chorify/core/notify';
import {
  applyCompletion,
  applyReopen,
  applySkip,
  requirePending,
  type TransitionInput,
} from '@chorify/core/occurrence-rules';
import { customRoleBaseline } from '@chorify/core/permissions';
import { purchaseGuard, supplyActivityType } from '@chorify/core/resources-rules';
import { lastOwnerBlockers, resetMatrixFor } from '@chorify/core/roles-rules';
import { accountCreationBlockers, promotionBlockers } from '@chorify/core/auth-rules';
import { PendingOpQueue } from '@chorify/local-db/queue';
import * as schema from '@chorify/local-db/schema';
import type { OccurrenceSubtaskState } from '@chorify/local-db/schema';
import type { DeviceDb } from './createHousehold';
import { openBrowserDevice } from './openDevice';
import { randomId } from './random';
import type { OccurrenceAction, TitledOccurrence } from '@/features/chores/chores.types';
import type { PersonPayload } from '@/features/household/household.types';

/** Mirror-state union (resources.ts keeps it inline — no named export). */
type SupplyState = 'available' | 'low' | 'out';

/**
 * Device-mode mutations (Phase A3, D58/D64/D67): the device DB is the system
 * of record for offline-only households. Every write applies LOCALLY FIRST
 * through the same core pure rules the server uses, mirrors the server's
 * activity + notification side effects (§4.10), then enqueues the full
 * after-state in pending_ops (client uuid = idempotency key, D44). Derived
 * rows (activity_events, notifications) are NEVER enqueued — the server
 * regenerates them from the primary op, exactly as its own mutating routes
 * would.
 */

export async function requireDeviceDb(): Promise<DeviceDb> {
  const device = await openBrowserDevice();
  if (device.db === null) {
    throw new Error('Offline storage is unavailable on this device.');
  }
  return device.db;
}

async function currentHousehold(db: DeviceDb): Promise<{ id: string; timezone: string }> {
  const household = (await db.select().from(schema.households)).at(0);
  if (!household) throw new AppError('NOT_FOUND', 'No household on this device');
  return { id: household.id, timezone: household.timezone };
}

function enqueue(
  db: DeviceDb,
  householdId: string,
  op: {
    entity: string;
    entityId: string;
    op: 'create' | 'update' | 'delete';
    payload: Record<string, unknown>;
    audienceType?: 'members' | 'roles' | 'all';
    audienceIds?: string[];
    domain?: string;
  },
): void {
  void new PendingOpQueue(db as never).enqueue({
    uuid: randomId(),
    householdId,
    entity: op.entity,
    entityId: op.entityId,
    op: op.op,
    payload: op.payload,
    audienceType: op.audienceType ?? 'all',
    audienceIds: op.audienceIds ?? [],
    domain: op.domain ?? 'responsibilities',
    createdAt: new Date().toISOString(),
  } as never);
}

async function emitActivity(
  db: DeviceDb,
  householdId: string,
  actorPersonId: string | null,
  type: ActivityType,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.insert(schema.activityEvents).values({
    id: randomId(),
    householdId,
    actorPersonId,
    ...buildActivity(type, payload),
    createdAt: new Date().toISOString(),
  });
}

/** §4.10 notification fan-out over the pure resolver — device twin of the server services. */
async function emitNotifications(
  db: DeviceDb,
  householdId: string,
  kind: NotifyKind,
  typeKey: string,
  paramsJson: Record<string, unknown>,
  linkPath: string | null,
  ctx: {
    assigneePersonIds?: readonly string[];
    ruleCreatorPersonId?: string | null;
    ownerPersonIds?: readonly string[];
    supplyManagerPersonIds?: readonly string[];
    actorPersonId: string | null;
  },
): Promise<void> {
  const recipients = resolveRecipients(kind, ctx);
  if (recipients.length === 0) return;
  const prefs = await db.select().from(schema.notificationPrefs);
  const prefsByPerson = new Map(prefs.map((p) => [p.personId, p.categories]));
  const finalRecipients = filterByPrefs(recipients, kind, (id) => prefsByPerson.get(id));
  if (finalRecipients.length === 0) return;
  await db.insert(schema.notifications).values(
    finalRecipients.map((personId) => ({
      id: randomId(),
      householdId,
      recipientPersonId: personId,
      category: KIND_CATEGORY[kind],
      type: typeKey,
      paramsJson,
      linkPath,
      createdAt: new Date().toISOString(),
      readAt: null,
    })),
  );
}

async function ownerPersonIds(db: DeviceDb, householdId: string): Promise<string[]> {
  const people = await db.select().from(schema.people);
  const roles = await db.select().from(schema.roles);
  const ownerRoleIds = new Set(roles.filter((r) => r.isOwnerRole).map((r) => r.id));
  return people
    .filter((p) => p.householdId === householdId && p.roleId !== null && ownerRoleIds.has(p.roleId))
    .map((p) => p.id);
}

async function supplyManagerPersonIds(db: DeviceDb, householdId: string): Promise<string[]> {
  const people = await db.select().from(schema.people);
  const roles = await db.select().from(schema.roles);
  const managerRoleIds = new Set(
    roles.filter((r) => r.permissions['resources.manage_supplies'] === true).map((r) => r.id),
  );
  return people
    .filter((p) => p.householdId === householdId && p.roleId !== null && managerRoleIds.has(p.roleId))
    .map((p) => p.id);
}

// ————————————————————————————————————————————————
// Occurrences (complete / skip / reopen / reassign)
// ————————————————————————————————————————————————

/** Device twin of OccurrencesService.act() — same rules, mirror rows, queue op. */
export async function deviceOccurrenceAct(input: {
  householdId: string;
  actorPersonId: string;
  occurrenceId: string;
  action: OccurrenceAction;
}): Promise<TitledOccurrence> {
  const db = await requireDeviceDb();
  const { householdId, actorPersonId, occurrenceId, action } = input;

  const row = await db.query.occurrences!.findFirst({ where: eq(schema.occurrences.id, occurrenceId) });
  if (!row) throw new AppError('NOT_FOUND', 'Occurrence not found');
  const responsibility = await db.query.responsibilities!.findFirst({
    where: eq(schema.responsibilities.id, row.responsibilityId),
  });
  const title = responsibility?.title ?? 'Chore';

  const transition: TransitionInput & { completedAt: Date | null } = {
    status: row.status,
    subtaskStates: (row.subtaskStates ?? {}) as Record<string, OccurrenceSubtaskState>,
    completedByPersonId: row.completedByPersonId,
    completedAt: row.completedAt ? new Date(row.completedAt) : null,
    note: row.note,
    skipReason: row.skipReason,
  };

  let patch: Partial<TransitionInput> & { personIds?: string[] };
  switch (action.action) {
    case 'complete':
      patch = applyCompletion(transition, actorPersonId, new Date(), action.note);
      break;
    case 'skip':
      patch = applySkip(transition, action.skipReason);
      break;
    case 'reopen':
      patch = applyReopen(transition, actorPersonId, new Date());
      break;
    case 'reassign':
      requirePending(row.status);
      patch = { personIds: action.personIds };
      break;
  }

  // Overwrite-in-place patch keeps fields not touched by the rule intact —
  // reopen clears completion metadata explicitly (§6.6).
  await db
    .update(schema.occurrences)
    .set({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.completedByPersonId !== undefined
        ? { completedByPersonId: patch.completedByPersonId }
        : {}),
      ...(patch.completedAt !== undefined
        ? { completedAt: patch.completedAt ? patch.completedAt.toISOString() : null }
        : {}),
      ...(patch.note !== undefined ? { note: patch.note ?? null } : {}),
      ...(patch.skipReason !== undefined ? { skipReason: patch.skipReason ?? null } : {}),
      ...(patch.subtaskStates !== undefined ? { subtaskStates: patch.subtaskStates } : {}),
      ...(patch.personIds !== undefined ? { personIds: patch.personIds } : {}),
    })
    .where(eq(schema.occurrences.id, row.id));

  const after = await db.query.occurrences!.findFirst({ where: eq(schema.occurrences.id, row.id) });

  switch (action.action) {
    case 'complete':
      await emitActivity(db, householdId, actorPersonId, 'occurrence.completed', { title });
      await emitNotifications(db, householdId, 'completion', 'notify.completion.recorded', { title }, '/chores', {
        ruleCreatorPersonId: await ruleCreator(db, row.ruleId),
        ownerPersonIds: await ownerPersonIds(db, householdId),
        actorPersonId,
      });
      break;
    case 'skip':
      await emitActivity(db, householdId, actorPersonId, 'occurrence.skipped', { title });
      break;
    case 'reopen':
      await emitActivity(db, householdId, actorPersonId, 'occurrence.reopened', { title });
      break;
    case 'reassign':
      await emitActivity(db, householdId, actorPersonId, 'occurrence.reassigned', {
        title,
        personIds: action.personIds,
      });
      await emitNotifications(db, householdId, 'assignment', 'notify.assignment.received', { title }, '/chores', {
        assigneePersonIds: action.personIds,
        actorPersonId,
      });
      break;
  }

  enqueue(db, householdId, {
    entity: 'occurrences',
    entityId: row.id,
    op: 'update',
    payload: { ...row, ...after },
    domain: 'responsibilities',
  });

  return {
    id: row.id,
    responsibilityId: row.responsibilityId,
    ruleId: row.ruleId,
    dueDate: row.dueDate,
    personIds: (after?.personIds ?? row.personIds) as string[],
    status: after?.status ?? row.status,
    completedByPersonId: after?.completedByPersonId ?? null,
    title,
  };
}

async function ruleCreator(db: DeviceDb, ruleId: string): Promise<string | null> {
  const rule = await db.query.assignmentRules!.findFirst({
    where: eq(schema.assignmentRules.id, ruleId),
  });
  return rule?.createdByPersonId ?? null;
}

// ————————————————————————————————————————————————
// Responsibilities (create)
// ————————————————————————————————————————————————

export async function deviceCreateResponsibility(input: {
  householdId: string;
  actorPersonId: string;
  title: string;
  notes?: string;
  icon?: string;
  routineId?: string | null;
  subtasks: Array<{ title: string; assigneePersonId?: string | null }>;
  rules: RuleInput[];
}): Promise<{ id: string; title: string }> {
  const db = await requireDeviceDb();
  const { householdId, actorPersonId } = input;
  const now = new Date().toISOString();
  const id = randomId();

  await db.insert(schema.responsibilities).values({
    id,
    householdId,
    title: input.title,
    notes: input.notes ?? null,
    routineId: input.routineId ?? null,
    icon: input.icon ?? '📌',
    createdByPersonId: actorPersonId,
    createdAt: now,
  });
  for (const [index, subtask] of input.subtasks.entries()) {
    await db.insert(schema.subtasks).values({
      id: randomId(),
      responsibilityId: id,
      title: subtask.title,
      sortOrder: index,
      assigneePersonId: subtask.assigneePersonId ?? null,
    });
  }
  // Server semantics (responsibilities.service §6.15): interval defaults to 1
  // for every_n patterns, anchored patterns anchor at startDate, weekly
  // without daysOfWeek pins the startDate weekday, monthly without monthDay
  // pins the startDate day-of-month, rotation persists verbatim.
  for (const rule of input.rules) {
    const ruleId = randomId();
    const everyN = rule.pattern === 'every_n_days' || rule.pattern === 'every_n_weeks';
    await db.insert(schema.assignmentRules).values({
      id: ruleId,
      responsibilityId: id,
      pattern: rule.pattern,
      interval: everyN ? (rule.interval ?? 1) : null,
      daysOfWeek:
        rule.pattern === 'weekly' || rule.pattern === 'every_n_weeks'
          ? (rule.daysOfWeek ?? weekdayOf(rule.startDate))
          : null,
      anchorDate:
        rule.pattern === 'every_n_days' || rule.pattern === 'every_n_weeks' || rule.rotation
          ? (rule.anchorDate ?? rule.startDate)
          : null,
      monthDay:
        rule.pattern === 'monthly'
          ? (rule.monthDay ?? Number(rule.startDate.slice(8, 10)))
          : null,
      dates: rule.dates ?? null,
      startDate: rule.startDate,
      endDate: rule.endDate ?? null,
      rotation: rule.rotation ?? null,
      personIds: rule.personIds,
      active: true,
      createdByPersonId: actorPersonId,
      createdAt: now,
    });
  }

  await emitActivity(db, householdId, actorPersonId, 'responsibility.created', { title: input.title });
  enqueue(db, householdId, {
    entity: 'responsibilities',
    entityId: id,
    op: 'create',
    payload: {
      id,
      householdId,
      title: input.title,
      notes: input.notes ?? null,
      routineId: input.routineId ?? null,
      icon: input.icon ?? '📌',
      createdByPersonId: actorPersonId,
      archivedAt: null,
      roomId: null,
      createdAt: now,
    },
    domain: 'responsibilities',
  });
  return { id, title: input.title };
}

function weekdayOf(iso: string): number[] {
  return [new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

// ————————————————————————————————————————————————
// Supplies + shopping
// ————————————————————————————————————————————————

export async function deviceCreateSupply(input: {
  householdId: string;
  actorPersonId: string;
  name: string;
}): Promise<{ id: string; name: string; state: SupplyState }> {
  const db = await requireDeviceDb();
  const now = new Date().toISOString();
  const id = randomId();
  await db.insert(schema.supplies).values({
    id,
    householdId: input.householdId,
    name: input.name,
    state: 'available',
    note: null,
    createdAt: now,
  });
  await emitActivity(db, input.householdId, input.actorPersonId, 'supply.added', { name: input.name });
  // D102: creation anchors cycle 0 — device twin of the server inserter.
  const createEventId = randomId();
  await db.insert(schema.supplyEvents).values({
    id: createEventId,
    householdId: input.householdId,
    supplyId: id,
    actorPersonId: input.actorPersonId,
    type: 'created',
    source: 'manual',
    quantityText: null,
    note: null,
    clientUuid: null,
    occurredAt: now,
    createdAt: now,
  });
  enqueue(db, input.householdId, {
    entity: 'supplies',
    entityId: id,
    op: 'create',
    payload: { id, householdId: input.householdId, name: input.name, state: 'available', note: null, createdAt: now },
    domain: 'resources',
  });
  enqueue(db, input.householdId, {
    entity: 'supply_events',
    entityId: createEventId,
    op: 'create',
    payload: {
      id: createEventId,
      householdId: input.householdId,
      supplyId: id,
      actorPersonId: input.actorPersonId,
      type: 'created',
      source: 'manual',
      quantityText: null,
      note: null,
      clientUuid: null,
      occurredAt: now,
      createdAt: now,
    },
    domain: 'resources',
  });
  return { id, name: input.name, state: 'available' };
}

export async function deviceCycleSupply(input: {
  householdId: string;
  actorPersonId: string;
  supplyId: string;
  state: SupplyState;
}): Promise<{ id: string; name: string; state: SupplyState }> {
  const db = await requireDeviceDb();
  const existing = await db.query.supplies!.findFirst({ where: eq(schema.supplies.id, input.supplyId) });
  if (!existing || existing.householdId !== input.householdId) {
    throw new AppError('NOT_FOUND', 'Supply not found');
  }
  await db
    .update(schema.supplies)
    .set({ state: input.state })
    .where(eq(schema.supplies.id, input.supplyId));
  if (input.state !== existing.state) {
    // §6.11: entering low/out emits; staying put or restocking stays silent.
    const type = supplyActivityType(input.state);
    if (type) {
      await emitActivity(db, input.householdId, input.actorPersonId, type, { name: existing.name });
      await emitNotifications(
        db,
        input.householdId,
        'supplyAlert',
        type === 'supply.low' ? 'notify.supply.low' : 'notify.supply.out',
        { name: existing.name },
        '/supplies',
        {
          supplyManagerPersonIds: await supplyManagerPersonIds(db, input.householdId),
          actorPersonId: input.actorPersonId,
        },
      );
    }
    // D102: EVERY transition lands in the event log — restocks close cycles.
    const eventId = randomId();
    const nowIso = new Date().toISOString();
    const eventType =
      input.state === 'low' ? 'marked_low' : input.state === 'out' ? 'marked_out' : 'restocked';
    await db.insert(schema.supplyEvents).values({
      id: eventId,
      householdId: input.householdId,
      supplyId: input.supplyId,
      actorPersonId: input.actorPersonId,
      type: eventType,
      source: 'manual',
      quantityText: null,
      note: null,
      clientUuid: null,
      occurredAt: nowIso,
      createdAt: nowIso,
    });
    enqueue(db, input.householdId, {
      entity: 'supply_events',
      entityId: eventId,
      op: 'create',
      payload: {
        id: eventId,
        householdId: input.householdId,
        supplyId: input.supplyId,
        actorPersonId: input.actorPersonId,
        type: eventType,
        source: 'manual',
        quantityText: null,
        note: null,
        clientUuid: null,
        occurredAt: nowIso,
        createdAt: nowIso,
      },
      domain: 'resources',
    });
  }
  enqueue(db, input.householdId, {
    entity: 'supplies',
    entityId: input.supplyId,
    op: 'update',
    payload: { ...existing, state: input.state },
    domain: 'resources',
  });
  return { id: existing.id, name: existing.name, state: input.state };
}

export async function deviceCreateShoppingItem(input: {
  householdId: string;
  actorPersonId: string;
  name: string;
}): Promise<{ id: string; name: string; purchasedAt: string | null; quantityText: string | null }> {
  const db = await requireDeviceDb();
  const now = new Date().toISOString();
  const id = randomId();
  await db.insert(schema.shoppingItems).values({
    id,
    householdId: input.householdId,
    name: input.name,
    quantityText: null,
    category: null,
    sourceSupplyId: null,
    purchasedAt: null,
    createdAt: now,
  });
  await emitActivity(db, input.householdId, input.actorPersonId, 'shopping_item.added', { name: input.name });
  enqueue(db, input.householdId, {
    entity: 'shopping_items',
    entityId: id,
    op: 'create',
    payload: {
      id,
      householdId: input.householdId,
      name: input.name,
      quantityText: null,
      category: null,
      sourceSupplyId: null,
      purchasedAt: null,
      createdAt: now,
    },
    domain: 'resources',
  });
  return { id, name: input.name, purchasedAt: null, quantityText: null };
}

/** Idempotent purchase (§6.12): purchaseGuard + silent supply restock (§6.11). */
export async function devicePurchaseItem(input: {
  householdId: string;
  actorPersonId: string;
  itemId: string;
}): Promise<{ id: string; name: string; purchasedAt: string | null; quantityText: string | null }> {
  const db = await requireDeviceDb();
  const item = await db.query.shoppingItems!.findFirst({ where: eq(schema.shoppingItems.id, input.itemId) });
  if (!item || item.householdId !== input.householdId) {
    throw new AppError('NOT_FOUND', 'Shopping item not found');
  }
  purchaseGuard({ purchasedAt: item.purchasedAt ? new Date(item.purchasedAt) : null });
  const nowIso = new Date().toISOString();
  await db
    .update(schema.shoppingItems)
    .set({ purchasedAt: nowIso })
    .where(eq(schema.shoppingItems.id, input.itemId));
  if (item.sourceSupplyId) {
    const supply = await db.query.supplies!.findFirst({
      where: eq(schema.supplies.id, item.sourceSupplyId),
    });
    if (supply && supply.householdId === input.householdId && supply.state !== 'available') {
      await db
        .update(schema.supplies)
        .set({ state: 'available' })
        .where(eq(schema.supplies.id, item.sourceSupplyId));
      // D102: purchase-driven restock enters the event log (source 'purchase').
      const restockEventId = randomId();
      await db.insert(schema.supplyEvents).values({
        id: restockEventId,
        householdId: input.householdId,
        supplyId: supply.id,
        actorPersonId: input.actorPersonId,
        type: 'restocked',
        source: 'purchase',
        quantityText: null,
        note: null,
        clientUuid: null,
        occurredAt: nowIso,
        createdAt: nowIso,
      });
      enqueue(db, input.householdId, {
        entity: 'supply_events',
        entityId: restockEventId,
        op: 'create',
        payload: {
          id: restockEventId,
          householdId: input.householdId,
          supplyId: supply.id,
          actorPersonId: input.actorPersonId,
          type: 'restocked',
          source: 'purchase',
          quantityText: null,
          note: null,
          clientUuid: null,
          occurredAt: nowIso,
          createdAt: nowIso,
        },
        domain: 'resources',
      });
    }
  }
  // D110: the SAME purchase advances the recurring reminder's anchor —
  // supply match first, then exact name. Server purchase() mirrors this
  // transactionally; LWW converges both sides on the same value.
  const recurringRows = await db
    .select()
    .from(schema.recurringShoppingItems)
    .where(eq(schema.recurringShoppingItems.householdId, input.householdId));
  const reminderMatch =
    (item.sourceSupplyId &&
      recurringRows.find((r) => r.state === 'active' && r.supplyId === item.sourceSupplyId)) ||
    recurringRows.find(
      (r) => r.state === 'active' && r.name.toLowerCase() === item.name.toLowerCase(),
    );
  if (reminderMatch) {
    await db
      .update(schema.recurringShoppingItems)
      .set({ lastPurchaseAt: nowIso, updatedAt: nowIso })
      .where(eq(schema.recurringShoppingItems.id, reminderMatch.id));
    enqueue(db, input.householdId, {
      entity: 'recurring_shopping_items',
      entityId: reminderMatch.id,
      op: 'update',
      payload: { ...reminderMatch, lastPurchaseAt: nowIso, updatedAt: nowIso },
      domain: 'resources',
    });
  }
  await emitActivity(db, input.householdId, input.actorPersonId, 'shopping_item.purchased', { name: item.name });
  enqueue(db, input.householdId, {
    entity: 'shopping_items',
    entityId: input.itemId,
    op: 'update',
    payload: { ...item, purchasedAt: nowIso },
    domain: 'resources',
  });
  return { id: item.id, name: item.name, purchasedAt: nowIso, quantityText: item.quantityText ?? null };
}

// ------------------------------------------------------------------
// Recurring buy reminders (§4A.3 / D108–D110) — REMINDERS ONLY.
// ------------------------------------------------------------------

export interface DeviceRecurringCreateInput {
  householdId: string;
  actorPersonId: string;
  name: string;
  intervalDays: number;
  quantityText?: string | null;
  note?: string | null;
  supplyId?: string | null;
  lastBoughtOn?: string | null;
}

export async function deviceCreateRecurringItem(
  input: DeviceRecurringCreateInput,
): Promise<{ id: string }> {
  const db = await requireDeviceDb();
  const nowIso = new Date().toISOString();
  const id = randomId();
  const row = {
    id,
    householdId: input.householdId,
    name: input.name,
    supplyId: input.supplyId ?? null,
    intervalDays: input.intervalDays,
    quantityText: input.quantityText ?? null,
    note: input.note ?? null,
    lastPurchaseAt: input.lastBoughtOn ?? null,
    snoozedUntil: null,
    state: 'active' as const,
    archivedAt: null,
    createdByPersonId: input.actorPersonId,
    clientUuid: id,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await db.insert(schema.recurringShoppingItems).values(row);
  await emitActivity(db, input.householdId, input.actorPersonId, 'reminder.created', { name: input.name });
  enqueue(db, input.householdId, {
    entity: 'recurring_shopping_items',
    entityId: id,
    op: 'create',
    payload: row,
    domain: 'resources',
  });
  return { id };
}

export async function deviceUpdateRecurringItem(input: {
  householdId: string;
  actorPersonId: string;
  itemId: string;
  patch: {
    name?: string;
    intervalDays?: number;
    quantityText?: string | null;
    note?: string | null;
    state?: 'active' | 'paused';
  };
}): Promise<void> {
  const db = await requireDeviceDb();
  const row = await db.query.recurringShoppingItems!.findFirst({
    where: eq(schema.recurringShoppingItems.id, input.itemId),
  });
  if (!row || row.householdId !== input.householdId) {
    throw new AppError('NOT_FOUND', 'Recurring item not found');
  }
  const nowIso = new Date().toISOString();
  const updated = { ...row, ...input.patch, updatedAt: nowIso };
  await db
    .update(schema.recurringShoppingItems)
    .set(updated)
    .where(eq(schema.recurringShoppingItems.id, input.itemId));
  if (input.patch.state !== undefined && input.patch.state !== row.state) {
    await emitActivity(db, input.householdId, input.actorPersonId, 'reminder.paused', { name: row.name });
  }
  enqueue(db, input.householdId, {
    entity: 'recurring_shopping_items',
    entityId: input.itemId,
    op: 'update',
    payload: updated,
    domain: 'resources',
  });
}

/** [Not now] — fixed 3-day snooze (D109); the anchor is untouched. */
export async function deviceSnoozeRecurringItem(input: {
  householdId: string;
  itemId: string;
  days?: number;
}): Promise<void> {
  const db = await requireDeviceDb();
  const row = await db.query.recurringShoppingItems!.findFirst({
    where: eq(schema.recurringShoppingItems.id, input.itemId),
  });
  if (!row || row.householdId !== input.householdId) {
    throw new AppError('NOT_FOUND', 'Recurring item not found');
  }
  const days = input.days ?? 3;
  const nowIso = new Date().toISOString();
  const snoozedUntil = new Date(Date.now() + days * 86_400_000).toISOString();
  const updated = { ...row, snoozedUntil, updatedAt: nowIso };
  await db
    .update(schema.recurringShoppingItems)
    .set(updated)
    .where(eq(schema.recurringShoppingItems.id, input.itemId));
  enqueue(db, input.householdId, {
    entity: 'recurring_shopping_items',
    entityId: input.itemId,
    op: 'update',
    payload: updated,
    domain: 'resources',
  });
}

/** Soft-archive — reminders disappear, history stays (§4A.3). */
export async function deviceArchiveRecurringItem(input: {
  householdId: string;
  actorPersonId: string;
  itemId: string;
}): Promise<void> {
  const db = await requireDeviceDb();
  const row = await db.query.recurringShoppingItems!.findFirst({
    where: eq(schema.recurringShoppingItems.id, input.itemId),
  });
  if (!row || row.householdId !== input.householdId) {
    throw new AppError('NOT_FOUND', 'Recurring item not found');
  }
  const nowIso = new Date().toISOString();
  const updated = { ...row, archivedAt: nowIso, state: 'paused' as const, updatedAt: nowIso };
  await db
    .update(schema.recurringShoppingItems)
    .set(updated)
    .where(eq(schema.recurringShoppingItems.id, input.itemId));
  await emitActivity(db, input.householdId, input.actorPersonId, 'reminder.archived', { name: row.name });
  enqueue(db, input.householdId, {
    entity: 'recurring_shopping_items',
    entityId: input.itemId,
    op: 'update',
    payload: updated,
    domain: 'resources',
  });
}

// ————————————————————————————————————————————————
// Routines
// ————————————————————————————————————————————————

export async function deviceCreateRoutine(input: {
  householdId: string;
  actorPersonId: string;
  name: string;
}): Promise<{ id: string; name: string; icon: string; timeBucket: string }> {
  const db = await requireDeviceDb();
  const now = new Date().toISOString();
  const id = randomId();
  await db.insert(schema.routines).values({
    id,
    householdId: input.householdId,
    name: input.name,
    icon: '🌅',
    timeBucket: 'anytime',
    createdAt: now,
  });
  await emitActivity(db, input.householdId, input.actorPersonId, 'routine.created', { name: input.name });
  enqueue(db, input.householdId, {
    entity: 'routines',
    entityId: id,
    op: 'create',
    payload: {
      id,
      householdId: input.householdId,
      name: input.name,
      icon: '🌅',
      timeBucket: 'anytime',
      createdAt: now,
    },
    domain: 'responsibilities',
  });
  return { id, name: input.name, icon: '🌅', timeBucket: 'anytime' };
}

export async function deviceDeleteRoutine(input: {
  householdId: string;
  actorPersonId: string;
  routineId: string;
}): Promise<{ ok: boolean }> {
  const db = await requireDeviceDb();
  const existing = await db.query.routines!.findFirst({ where: eq(schema.routines.id, input.routineId) });
  if (!existing || existing.householdId !== input.householdId) {
    throw new AppError('NOT_FOUND', 'Routine not found');
  }
  const refs = await db.query.responsibilities!.findMany({
    where: eq(schema.responsibilities.routineId, input.routineId),
  });
  if (refs.length > 0) {
    throw new AppError('IN_USE', 'Detach responsibilities from this routine first');
  }
  await db.delete(schema.routines).where(eq(schema.routines.id, input.routineId));
  await emitActivity(db, input.householdId, input.actorPersonId, 'routine.removed', { name: existing.name });
  enqueue(db, input.householdId, {
    entity: 'routines',
    entityId: input.routineId,
    op: 'delete',
    payload: {},
    domain: 'responsibilities',
  });
  return { ok: true };
}

// ————————————————————————————————————————————————
// Home (rooms, assets, service records)
// ————————————————————————————————————————————————

export async function deviceCreateRoom(input: {
  householdId: string;
  actorPersonId: string;
  name: string;
}): Promise<{ id: string; name: string; icon: string }> {
  const db = await requireDeviceDb();
  const now = new Date().toISOString();
  const id = randomId();
  await db.insert(schema.rooms).values({
    id,
    householdId: input.householdId,
    name: input.name,
    icon: '🏠',
    createdAt: now,
  });
  await emitActivity(db, input.householdId, input.actorPersonId, 'room.added', { name: input.name });
  enqueue(db, input.householdId, {
    entity: 'rooms',
    entityId: id,
    op: 'create',
    payload: { id, householdId: input.householdId, name: input.name, icon: '🏠', createdAt: now },
    domain: 'home',
  });
  return { id, name: input.name, icon: '🏠' };
}

export async function deviceCreateAsset(input: {
  householdId: string;
  actorPersonId: string;
  name: string;
  roomId?: string | null;
}): Promise<{ id: string; name: string; icon: string; roomId: string | null; maintenanceIntervalDays: number | null }> {
  const db = await requireDeviceDb();
  const now = new Date().toISOString();
  const id = randomId();
  await db.insert(schema.assets).values({
    id,
    householdId: input.householdId,
    roomId: input.roomId ?? null,
    name: input.name,
    icon: '🔧',
    maintenanceIntervalDays: null,
    createdAt: now,
  });
  await emitActivity(db, input.householdId, input.actorPersonId, 'asset.added', { name: input.name });
  enqueue(db, input.householdId, {
    entity: 'assets',
    entityId: id,
    op: 'create',
    payload: {
      id,
      householdId: input.householdId,
      roomId: input.roomId ?? null,
      name: input.name,
      icon: '🔧',
      maintenanceIntervalDays: null,
      createdAt: now,
    },
    domain: 'home',
  });
  return { id, name: input.name, icon: '🔧', roomId: input.roomId ?? null, maintenanceIntervalDays: null };
}

export async function deviceLogService(input: {
  householdId: string;
  actorPersonId: string;
  assetId: string;
  servicedOn: string;
}): Promise<void> {
  const db = await requireDeviceDb();
  const asset = await db.query.assets!.findFirst({ where: eq(schema.assets.id, input.assetId) });
  if (!asset || asset.householdId !== input.householdId) {
    throw new AppError('NOT_FOUND', 'Asset not found');
  }
  const id = randomId();
  await db.insert(schema.serviceRecords).values({
    id,
    assetId: input.assetId,
    servicedOn: input.servicedOn,
    note: null,
    createdAt: new Date().toISOString(),
  });
  await emitActivity(db, input.householdId, input.actorPersonId, 'asset.serviced', {
    assetName: asset.name,
  });
  enqueue(db, input.householdId, {
    entity: 'service_records',
    entityId: id,
    op: 'create',
    payload: { id, assetId: input.assetId, servicedOn: input.servicedOn, note: null },
    domain: 'home',
  });
}

// ————————————————————————————————————————————————
// Social (notifications)
// ————————————————————————————————————————————————

/** Twin of SocialService.markNotificationRead: recipient-scoped, idempotent. */
export async function deviceMarkNotificationRead(input: {
  notificationId: string;
}): Promise<{ ok: boolean }> {
  const db = await requireDeviceDb();
  const row = await db.query.notifications!.findFirst({
    where: eq(schema.notifications.id, input.notificationId),
  });
  if (!row) throw new AppError('NOT_FOUND', 'Notification not found');
  if (row.readAt === null) {
    await db
      .update(schema.notifications)
      .set({ readAt: new Date().toISOString() })
      .where(eq(schema.notifications.id, row.id));
  }
  return { ok: true };
}

/** Twin of SocialService.markAllRead over THIS device's people rows. */
export async function deviceReadAllNotifications(): Promise<{ marked: number }> {
  const db = await requireDeviceDb();
  const rows = await db.select().from(schema.notifications);
  const unread = rows.filter((n) => n.readAt === null);
  const nowIso = new Date().toISOString();
  for (const row of unread) {
    await db
      .update(schema.notifications)
      .set({ readAt: nowIso })
      .where(eq(schema.notifications.id, row.id));
  }
  return { marked: unread.length };
}

/** Twin of the prefs PUT: partial merge over the stored toggles. */
export async function deviceSaveNotificationPrefs(input: {
  categories: Record<string, boolean>;
}): Promise<void> {
  const db = await requireDeviceDb();
  const person = (await db.select().from(schema.people)).at(0);
  if (!person) throw new AppError('NOT_FOUND', 'No person on this device');
  const existing = await db.query.notificationPrefs!.findFirst({
    where: eq(schema.notificationPrefs.personId, person.id),
  });
  const merged = { ...(existing?.categories ?? {}), ...input.categories };
  if (existing) {
    await db
      .update(schema.notificationPrefs)
      .set({ categories: merged })
      .where(eq(schema.notificationPrefs.personId, person.id));
  } else {
    await db
      .insert(schema.notificationPrefs)
      .values({ personId: person.id, categories: merged });
  }
  enqueue(db, (await currentHousehold(db)).id, {
    entity: 'notification_prefs',
    entityId: person.id,
    op: existing ? 'update' : 'create',
    payload: { personId: person.id, categories: merged },
    audienceType: 'members',
    audienceIds: [person.id],
    domain: 'household',
  });
}

// ————————————————————————————————————————————————
// Household (people, roles)
// ————————————————————————————————————————————————

export async function deviceCreatePerson(input: {
  householdId: string;
  actorPersonId: string;
  name: string;
  roleId?: string | null;
  sex?: 'male' | 'female' | null;
  birthDate?: string | null;
  age?: number | null;
  avatarEmoji?: string;
}): Promise<PersonPayload> {
  const db = await requireDeviceDb();
  if (input.roleId) {
    const role = await db.query.roles!.findFirst({ where: eq(schema.roles.id, input.roleId) });
    if (!role) throw new AppError('NOT_FOUND', 'Role not found');
    // R2 (D54): owners created through the people flow require a contact.
    const blockers = accountCreationBlockers(
      { targetHoldsOwnerRole: role.isOwnerRole },
      { hasPhone: false, hasVerifiedEmail: false },
    );
    if (blockers.length > 0) {
      throw new AppError('CONFLICT', 'Owners need a phone number for recovery', { blockers });
    }
  }
  const id = randomId();
  await db.insert(schema.people).values({
    id,
    householdId: input.householdId,
    name: input.name,
    sex: input.sex ?? null,
    birthDate: input.birthDate ?? null,
    age: input.age ?? null,
    avatarEmoji: input.avatarEmoji ?? '🙂',
    roleId: input.roleId ?? null,
    permissionOverrides: {},
    phone: null,
    language: null,
    createdAt: new Date().toISOString(),
  });
  await emitActivity(db, input.householdId, input.actorPersonId, 'person.added', { personName: input.name });
  enqueue(db, input.householdId, {
    entity: 'people',
    entityId: id,
    op: 'create',
    payload: {
      id,
      householdId: input.householdId,
      name: input.name,
      sex: input.sex ?? null,
      birthDate: input.birthDate ?? null,
      age: input.age ?? null,
      avatarEmoji: input.avatarEmoji ?? '🙂',
      roleId: input.roleId ?? null,
      permissionOverrides: {},
      phone: null,
      language: null,
    },
    domain: 'household',
  });
  return {
    id,
    name: input.name,
    avatarEmoji: input.avatarEmoji ?? '🙂',
    roleId: input.roleId ?? null,
    phone: null,
    permissionOverrides: {},
    sex: input.sex ?? null,
    birthDate: input.birthDate ?? null,
    age: input.age ?? null,
  };
}

export async function deviceDeletePerson(input: {
  householdId: string;
  actorPersonId: string;
  personId: string;
}): Promise<{ ok: boolean }> {
  const db = await requireDeviceDb();
  const row = await db.query.people!.findFirst({ where: eq(schema.people.id, input.personId) });
  if (!row || row.householdId !== input.householdId) {
    throw new AppError('NOT_FOUND', 'Person not found');
  }
  const owners = await ownerPersonIds(db, input.householdId);
  if (row.roleId !== null && owners.includes(row.id)) {
    const remaining = owners.filter((id) => id !== row.id);
    if (lastOwnerBlockers(remaining.length).length > 0) {
      throw new AppError('LAST_OWNER', 'Assign another owner before removing this person');
    }
  }
  await db.delete(schema.users).where(eq(schema.users.personId, row.id));
  await db.delete(schema.people).where(eq(schema.people.id, row.id));
  await emitActivity(db, input.householdId, input.actorPersonId, 'person.removed', {
    personName: row.name,
  });
  enqueue(db, input.householdId, {
    entity: 'people',
    entityId: row.id,
    op: 'delete',
    payload: {},
    domain: 'household',
  });
  return { ok: true };
}

export async function deviceUpdatePerson(input: {
  householdId: string;
  actorPersonId: string;
  personId: string;
  name?: string;
  roleId?: string | null;
  permissionOverrides?: Record<string, boolean>;
  avatarEmoji?: string;
  sex?: 'male' | 'female' | null;
  birthDate?: string | null;
  age?: number | null;
  phone?: string | null;
}): Promise<PersonPayload> {
  const db = await requireDeviceDb();
  const row = await db.query.people!.findFirst({ where: eq(schema.people.id, input.personId) });
  if (!row || row.householdId !== input.householdId) {
    throw new AppError('NOT_FOUND', 'Person not found');
  }

  if (input.roleId !== undefined && input.roleId !== row.roleId) {
    const nextRole = input.roleId
      ? await db.query.roles!.findFirst({ where: eq(schema.roles.id, input.roleId) })
      : null;
    if (input.roleId && !nextRole) throw new AppError('NOT_FOUND', 'Role not found');
    const owners = await ownerPersonIds(db, input.householdId);
    const wasOwner = row.roleId !== null && owners.includes(row.id);
    const willBeOwner = nextRole?.isOwnerRole === true;
    if (!wasOwner && willBeOwner) {
      // D54/D56: device users carry no verified email; phone on the user row counts.
      const account = await db.query.users!.findFirst({ where: eq(schema.users.personId, row.id) });
      const blockers = promotionBlockers({ hasPhone: Boolean(account?.phone), hasVerifiedEmail: false });
      if (blockers.length > 0) {
        throw new AppError('CONFLICT', 'Add a phone number or Google link before granting ownership', {
          blockers,
        });
      }
    }
    if (wasOwner && !willBeOwner) {
      if (lastOwnerBlockers(owners.filter((id) => id !== row.id).length).length > 0) {
        throw new AppError('LAST_OWNER', 'The household needs at least one owner');
      }
    }
  }

  const next = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.roleId !== undefined ? { roleId: input.roleId } : {}),
    ...(input.permissionOverrides !== undefined ? { permissionOverrides: input.permissionOverrides } : {}),
    ...(input.avatarEmoji !== undefined ? { avatarEmoji: input.avatarEmoji } : {}),
    ...(input.sex !== undefined ? { sex: input.sex } : {}),
    ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
    ...(input.age !== undefined ? { age: input.age } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
  };
  await db.update(schema.people).set(next).where(eq(schema.people.id, row.id));
  await emitActivity(db, input.householdId, input.actorPersonId, 'person.updated', {
    personName: input.name ?? row.name,
  });
  enqueue(db, input.householdId, {
    entity: 'people',
    entityId: row.id,
    op: 'update',
    payload: { ...row, ...next },
    domain: 'household',
  });
  const after = await db.query.people!.findFirst({ where: eq(schema.people.id, row.id) });
  return {
    id: row.id,
    name: after?.name ?? input.name ?? row.name,
    avatarEmoji: after?.avatarEmoji ?? row.avatarEmoji,
    roleId: after?.roleId ?? null,
    phone: after?.phone ?? null,
    permissionOverrides: (after?.permissionOverrides ?? {}) as Record<string, boolean>,
    sex: (after?.sex ?? null) as PersonPayload['sex'],
    birthDate: after?.birthDate ?? null,
    age: after?.age ?? null,
  };
}

export async function deviceCreateRole(input: {
  householdId: string;
  actorPersonId: string;
  name: string;
}): Promise<{
  id: string;
  name: string;
  description: string | null;
  isOwnerRole: boolean;
  isBuiltin: boolean;
  builtinKey: string | null;
  permissions: Record<string, boolean>;
}> {
  const db = await requireDeviceDb();
  const now = new Date().toISOString();
  const id = randomId();
  const permissions = customRoleBaseline();
  await db.insert(schema.roles).values({
    id,
    householdId: input.householdId,
    builtinKey: null,
    name: input.name,
    description: null,
    isOwnerRole: false,
    isBuiltin: false,
    permissions,
    defaultPermissions: permissions,
    createdAt: now,
  });
  await emitActivity(db, input.householdId, input.actorPersonId, 'role.added', { roleName: input.name });
  enqueue(db, input.householdId, {
    entity: 'roles',
    entityId: id,
    op: 'create',
    payload: {
      id,
      householdId: input.householdId,
      builtinKey: null,
      name: input.name,
      description: null,
      isOwnerRole: false,
      isBuiltin: false,
      permissions,
      defaultPermissions: permissions,
      createdAt: now,
    },
    domain: 'household',
  });
  return {
    id,
    name: input.name,
    description: null,
    isOwnerRole: false,
    isBuiltin: false,
    builtinKey: null,
    permissions,
  };
}

export async function deviceResetRole(input: {
  householdId: string;
  actorPersonId: string;
  roleId: string;
}): Promise<{
  id: string;
  name: string;
  description: string | null;
  isOwnerRole: boolean;
  isBuiltin: boolean;
  builtinKey: string | null;
  permissions: Record<string, boolean>;
}> {
  const db = await requireDeviceDb();
  const row = await db.query.roles!.findFirst({ where: eq(schema.roles.id, input.roleId) });
  if (!row || row.householdId !== input.householdId) throw new AppError('NOT_FOUND', 'Role not found');
  const permissions = resetMatrixFor({
    isBuiltin: row.isBuiltin,
    builtinKey: row.builtinKey,
    defaultPermissions: row.defaultPermissions as Parameters<typeof resetMatrixFor>[0]['defaultPermissions'],
  });
  await db.update(schema.roles).set({ permissions }).where(eq(schema.roles.id, row.id));
  await emitActivity(db, input.householdId, input.actorPersonId, 'role.reset', { roleName: row.name });
  enqueue(db, input.householdId, {
    entity: 'roles',
    entityId: row.id,
    op: 'update',
    payload: { ...row, permissions },
    domain: 'household',
  });
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isOwnerRole: row.isOwnerRole,
    isBuiltin: row.isBuiltin,
    builtinKey: row.builtinKey,
    permissions,
  };
}
