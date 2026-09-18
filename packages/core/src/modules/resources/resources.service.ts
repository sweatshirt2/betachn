import { and, desc, eq } from 'drizzle-orm';
import { computeSupplyCycleStats, suggestibleCycle } from './resources.rules';
import {
  activityEvents,
  recurringShoppingItems,
  shoppingItems,
  supplies,
  supplyEvents,
} from '@chorify/db';
import { buildActivity } from '../../activity';
import type { Executor, UnitOfWork } from '../../db';
import { AppError } from '../../errors';
import type { Clock } from '../../ports';
import type {
  CreateRecurringItemInput,
  CreateShoppingItemInput,
  CreateSupplyEventInput,
  CreateSupplyInput,
  ReorderShoppingItemInput,
  RecurringItemRecord,
  ShoppingItemRecord,
  SupplyEventRecord,
  SupplyRecord,
  UpdateRecurringItemInput,
  UpdateShoppingItemInput,
  UpdateSupplyEventInput,
  UpdateSupplyInput,
} from './resources.schema';
import {
  recurringItemRowSchema,
  shoppingItemRowSchema,
  supplyEventRowSchema,
  supplyRowSchema,
} from './resources.schema';
import {
  purchaseGuard,
  supplyActivityType,
  supplyEventTypeForTransition,
} from './resources.rules';

/**
 * Supplies + shopping list (§2.5 / §6.11–12). State changes emit activity
 * only on ENTERING low/out; purchase restocks the linked supply silently and
 * is idempotent. No notification rows are written here.
 */
export class ResourcesService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  // — supplies —

  async listSupplies(householdId: string): Promise<SupplyRecord[]> {
    const rows = await this.uow.exec.query.supplies!.findMany({
      where: eq(supplies.householdId, householdId),
    });
    return rows.map((row) => supplyRowSchema.parse(row));
  }

  async createSupply(
    actorPersonId: string | null,
    householdId: string,
    input: CreateSupplyInput,
  ): Promise<SupplyRecord> {
    const [row] = await this.uow.exec.insert(supplies).values({
      householdId,
      name: input.name,
      state: input.state,
      note: input.note ?? null,
    }).returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId,
      actorPersonId,
      ...buildActivity('supply.added', { name: row?.name ?? input.name }),
    });
    // D102: creation anchors cycle 0 in the event log.
    await this.insertSupplyEvent(this.uow.exec, {
      householdId,
      supplyId: String(row!.id),
      actorPersonId,
      type: 'created',
      source: 'manual',
      quantityText: null,
      note: null,
    });
    return supplyRowSchema.parse(row);
  }

  async updateSupply(
    actorPersonId: string | null,
    householdId: string,
    supplyId: string,
    input: UpdateSupplyInput,
  ): Promise<SupplyRecord> {
    const existing = await this.uow.exec.query.supplies!.findFirst({
      where: eq(supplies.id, supplyId),
    });
    if (!existing || existing.householdId !== householdId) throw new AppError('NOT_FOUND', 'Supply not found');
    const [updated] = await this.uow.exec.update(supplies).set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    }).where(eq(supplies.id, supplyId)).returning();
    if (!updated) throw new AppError('NOT_FOUND', 'Supply not found');
    if (input.state !== undefined && input.state !== existing.state) {
      // §6.11: entering low/out emits; staying put or restocking stays silent.
      const type = supplyActivityType(input.state);
      if (type) {
        await this.uow.exec.insert(activityEvents).values({
          householdId,
          actorPersonId,
          ...buildActivity(type, { name: updated.name }),
        });
      }
      // D102: EVERY transition lands in the event log — including restocks
      // (X→available closes the consumption cycle).
      await this.insertSupplyEvent(this.uow.exec, {
        householdId,
        supplyId,
        actorPersonId,
        type: supplyEventTypeForTransition(input.state),
        source: 'manual',
        quantityText: input.quantityText ?? null,
        note: null,
      });
    }
    return supplyRowSchema.parse(updated);
  }

  // — shopping list —

  async listShoppingItems(householdId: string): Promise<ShoppingItemRecord[]> {
    const rows = await this.uow.exec.query.shoppingItems!.findMany({
      where: eq(shoppingItems.householdId, householdId),
    });
    // Manual drag order first (D115), then creation time for ties/pre-sortKey rows.
    const parsed = rows.map((row) => shoppingItemRowSchema.parse(row));
    parsed.sort((a, b) => {
      const ka = a.sortKey;
      const kb = b.sortKey;
      if (ka !== null && kb !== null && ka !== kb) return ka - kb;
      if (ka !== null && kb === null) return -1;
      if (ka === null && kb !== null) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    return parsed;
  }

  /**
   * D115 drag-to-reorder: assign the dragged item a sparse sortKey between
   * its new neighbors — one row written, row-level LWW syncs the position.
   * Null neighbors (open ends / pre-feature rows) fall back to ±1000 steps.
   */
  async reorderShoppingItem(
    actorPersonId: string | null,
    householdId: string,
    input: ReorderShoppingItemInput,
  ): Promise<ShoppingItemRecord> {
    return this.uow.transact(async (tx) => {
      const rows = await tx.query.shoppingItems!.findMany({
        where: eq(shoppingItems.householdId, householdId),
        orderBy: [shoppingItems.createdAt],
      });
      const byId = new Map(rows.map((r) => [r.id, r]));
      if (!byId.has(input.itemId)) throw new AppError('NOT_FOUND', 'Shopping item not found');
      const before = input.beforeItemId ? byId.get(input.beforeItemId) : undefined;
      const after = input.afterItemId ? byId.get(input.afterItemId) : undefined;
      if (input.beforeItemId && !before) throw new AppError('VALIDATION_ERROR', 'Unknown before item');
      if (input.afterItemId && !after) throw new AppError('VALIDATION_ERROR', 'Unknown after item');

      const keyOf = (row: { sortKey: number | null } | undefined): number | undefined =>
        row === undefined ? undefined : (row.sortKey ?? 0);
      const beforeKey = keyOf(before as { sortKey: number | null } | undefined);
      const afterKey = keyOf(after as { sortKey: number | null } | undefined);

      let sortKey: number;
      if (beforeKey !== undefined && afterKey !== undefined) {
        sortKey = (beforeKey + afterKey) / 2;
      } else if (beforeKey !== undefined) {
        sortKey = beforeKey + 1000;
      } else if (afterKey !== undefined) {
        sortKey = afterKey - 1000;
      } else {
        // Freed to the end of the list.
        let maxKey = 0;
        for (const r of rows) {
          const k = Number(r.sortKey);
          if (!Number.isNaN(k) && k > maxKey) maxKey = k;
        }
        sortKey = maxKey + 1000;
      }

      const [updated] = await tx
        .update(shoppingItems)
        .set({ sortKey })
        .where(eq(shoppingItems.id, input.itemId))
        .returning();
      return shoppingItemRowSchema.parse(updated);
    });
  }

  async createShoppingItem(
    actorPersonId: string | null,
    householdId: string,
    input: CreateShoppingItemInput,
  ): Promise<ShoppingItemRecord> {
    const [row] = await this.uow.exec.insert(shoppingItems).values({
      householdId,
      name: input.name,
      quantityText: input.quantityText ?? null,
      category: input.category ?? null,
      sourceSupplyId: input.sourceSupplyId ?? null,
    }).returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId,
      actorPersonId,
      ...buildActivity('shopping_item.added', { name: row?.name ?? input.name }),
    });
    return shoppingItemRowSchema.parse(row);
  }

  async updateShoppingItem(
    actorPersonId: string | null,
    householdId: string,
    itemId: string,
    input: UpdateShoppingItemInput,
  ): Promise<ShoppingItemRecord> {
    const existing = await this.shoppingItemRow(this.uow.exec, householdId, itemId);
    const [updated] = await this.uow.exec.update(shoppingItems).set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.quantityText !== undefined ? { quantityText: input.quantityText } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.sourceSupplyId !== undefined ? { sourceSupplyId: input.sourceSupplyId } : {}),
    }).where(eq(shoppingItems.id, itemId)).returning();
    if (!updated) throw new AppError('NOT_FOUND', 'Shopping item not found');
    return shoppingItemRowSchema.parse(updated);
  }

  /**
   * Idempotent purchase (§6.12): stamps purchasedAt, restocks the linked
   * supply to available WITHOUT emitting (§6.11), records the purchase event.
   */
  async purchase(
    actorPersonId: string | null,
    householdId: string,
    itemId: string,
  ): Promise<ShoppingItemRecord> {
    return this.uow.transact(async (tx) => {
      const item = await this.shoppingItemRow(tx, householdId, itemId);
      purchaseGuard(item);
      const [updated] = await tx.update(shoppingItems)
        .set({ purchasedAt: this.clock.now() })
        .where(eq(shoppingItems.id, itemId))
        .returning();
      if (!updated) throw new AppError('NOT_FOUND', 'Shopping item not found');
      if (item.sourceSupplyId) {
        const supply = await tx.query.supplies!.findFirst({
          where: eq(supplies.id, item.sourceSupplyId),
        });
        if (supply && supply.householdId === householdId) {
          await tx.update(supplies)
            .set({ state: 'available' })
            .where(eq(supplies.id, item.sourceSupplyId));
          // D102: purchase-driven restock lands in the event log (source
          // 'purchase') so consumption cycles track real buying, not just
          // manual state edits. §6.11 silence for activity unchanged.
          if (supply.state !== 'available') {
            await this.insertSupplyEvent(tx, {
              householdId,
              supplyId: String(supply.id),
              actorPersonId,
              type: 'restocked',
              source: 'purchase',
              quantityText: null,
              note: null,
            });
          }
        }
      }
      // D110: the purchase advances the recurring reminder's anchor (if a
      // matching reminder exists) — same transaction, never schedule-driven.
      await this.advanceRecurringAnchorOnPurchase(
        tx,
        householdId,
        String(updated.name),
        item.sourceSupplyId,
        this.clock.now(),
      );
      await tx.insert(activityEvents).values({
        householdId,
        actorPersonId,
        ...buildActivity('shopping_item.purchased', { name: updated.name }),
      });
      return shoppingItemRowSchema.parse(updated);
    });
  }

  /** Open or purchased alike — history lives in the recorded activity feed. */
  async removeShoppingItem(actorPersonId: string | null, householdId: string, itemId: string): Promise<void> {
    await this.shoppingItemRow(this.uow.exec, householdId, itemId);
    await this.uow.exec.delete(shoppingItems).where(eq(shoppingItems.id, itemId));
  }

  // — supply event log (§4A.1 / D102) —

  async listSupplyEvents(
    householdId: string,
    supplyId: string,
    limit = 100,
  ): Promise<SupplyEventRecord[]> {
    const supply = await this.uow.exec.query.supplies!.findFirst({
      where: eq(supplies.id, supplyId),
    });
    if (!supply || supply.householdId !== householdId) {
      throw new AppError('NOT_FOUND', 'Supply not found');
    }
    const rows = await this.uow.exec.query.supplyEvents!.findMany({
      where: and(eq(supplyEvents.householdId, householdId), eq(supplyEvents.supplyId, supplyId)),
      orderBy: [desc(supplyEvents.occurredAt)],
      limit,
    });
    return rows.map((row) => supplyEventRowSchema.parse(row));
  }

  /** D102: the optional restock quantity stays editable after the fact. */
  async updateSupplyEvent(
    actorPersonId: string | null,
    householdId: string,
    eventId: string,
    input: UpdateSupplyEventInput,
  ): Promise<SupplyEventRecord> {
    const row = await this.uow.exec.query.supplyEvents!.findFirst({
      where: eq(supplyEvents.id, eventId),
    });
    if (!row || row.householdId !== householdId) {
      throw new AppError('NOT_FOUND', 'Supply event not found');
    }
    const [updated] = await this.uow.exec.update(supplyEvents).set({
      ...(input.quantityText !== undefined ? { quantityText: input.quantityText ?? null } : {}),
      ...(input.note !== undefined ? { note: input.note ?? null } : {}),
    }).where(eq(supplyEvents.id, eventId)).returning();
    if (!updated) throw new AppError('NOT_FOUND', 'Supply event not found');
    void actorPersonId;
    return supplyEventRowSchema.parse(updated);
  }

  /**
   * Manual event creation — the idempotent sync path (client uuid = the
   * idempotency key). Server-made transitions use the private inserter.
   */
  async createSupplyEvent(
    actorPersonId: string | null,
    householdId: string,
    supplyId: string,
    clientUuid: string,
    input: CreateSupplyEventInput,
  ): Promise<SupplyEventRecord> {
    const supply = await this.uow.exec.query.supplies!.findFirst({
      where: eq(supplies.id, supplyId),
    });
    if (!supply || supply.householdId !== householdId) {
      throw new AppError('NOT_FOUND', 'Supply not found');
    }
    const existing = clientUuid
      ? await this.uow.exec.query.supplyEvents!.findFirst({
          where: eq(supplyEvents.clientUuid, clientUuid),
        })
      : undefined;
    if (existing) return supplyEventRowSchema.parse(existing);
    const [row] = await this.uow.exec.insert(supplyEvents).values({
      householdId,
      supplyId,
      actorPersonId,
      type: input.type,
      source: input.source,
      quantityText: input.quantityText ?? null,
      note: input.note ?? null,
      clientUuid,
      ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
    }).returning();
    return supplyEventRowSchema.parse(row);
  }

  /** Shared event inserter — server-side transitions carry no client uuid. */
  private async insertSupplyEvent(
    exec: Executor,
    value: {
      householdId: string;
      supplyId: string;
      actorPersonId: string | null;
      type: 'created' | 'restocked' | 'marked_low' | 'marked_out';
      source: 'manual' | 'purchase';
      quantityText: string | null;
      note: string | null;
    },
  ): Promise<void> {
    await exec.insert(supplyEvents).values({
      householdId: value.householdId,
      supplyId: value.supplyId,
      actorPersonId: value.actorPersonId,
      type: value.type,
      source: value.source,
      quantityText: value.quantityText,
      note: value.note,
      clientUuid: null,
      occurredAt: this.clock.now(),
    });
  }

  // — recurring buy reminders (§4A.3 / D108–D110) —

  async listRecurringItems(householdId: string): Promise<RecurringItemRecord[]> {
    const rows = await this.uow.exec.query.recurringShoppingItems!.findMany({
      where: eq(recurringShoppingItems.householdId, householdId),
    });
    return rows.map((row) => recurringItemRowSchema.parse(row));
  }

  async createRecurringItem(
    actorPersonId: string | null,
    householdId: string,
    clientUuid: string,
    input: CreateRecurringItemInput,
  ): Promise<RecurringItemRecord> {
    const existing = clientUuid
      ? await this.uow.exec.query.recurringShoppingItems!.findFirst({
          where: eq(recurringShoppingItems.clientUuid, clientUuid),
        })
      : undefined;
    if (existing) return recurringItemRowSchema.parse(existing);
    const [row] = await this.uow.exec.insert(recurringShoppingItems).values({
      householdId,
      name: input.name,
      supplyId: input.supplyId ?? null,
      intervalDays: input.intervalDays,
      quantityText: input.quantityText ?? null,
      note: input.note ?? null,
      lastPurchaseAt: input.lastBoughtOn ?? null,
      createdByPersonId: actorPersonId,
      clientUuid,
    }).returning();
    return recurringItemRowSchema.parse(row);
  }

  async updateRecurringItem(
    householdId: string,
    itemId: string,
    input: UpdateRecurringItemInput,
  ): Promise<RecurringItemRecord> {
    await this.recurringItemRow(this.uow.exec, householdId, itemId);
    const [updated] = await this.uow.exec.update(recurringShoppingItems).set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.intervalDays !== undefined ? { intervalDays: input.intervalDays } : {}),
      ...(input.quantityText !== undefined ? { quantityText: input.quantityText ?? null } : {}),
      ...(input.note !== undefined ? { note: input.note ?? null } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      updatedAt: this.clock.now(),
    }).where(eq(recurringShoppingItems.id, itemId)).returning();
    if (!updated) throw new AppError('NOT_FOUND', 'Recurring item not found');
    return recurringItemRowSchema.parse(updated);
  }

  /** Snooze the next reminder (D109) — anchor (lastPurchaseAt) untouched. */
  async snoozeRecurringItem(
    householdId: string,
    itemId: string,
    days: number,
  ): Promise<RecurringItemRecord> {
    await this.recurringItemRow(this.uow.exec, householdId, itemId);
    const until = new Date(this.clock.now().getTime() + days * 86_400_000);
    const [updated] = await this.uow.exec.update(recurringShoppingItems)
      .set({ snoozedUntil: until, updatedAt: this.clock.now() })
      .where(eq(recurringShoppingItems.id, itemId))
      .returning();
    if (!updated) throw new AppError('NOT_FOUND', 'Recurring item not found');
    return recurringItemRowSchema.parse(updated);
  }

  /** Soft-archive (§4A.3): reminders disappear, history stays. */
  async archiveRecurringItem(householdId: string, itemId: string): Promise<void> {
    await this.recurringItemRow(this.uow.exec, householdId, itemId);
    await this.uow.exec.update(recurringShoppingItems)
      .set({ archivedAt: this.clock.now(), state: 'paused', updatedAt: this.clock.now() })
      .where(eq(recurringShoppingItems.id, itemId));
  }

  /**
   * D110: a purchase advances the anchor. Called from `purchase` inside the
   * same transaction — matching by linked supply first, then exact name.
   */
  private async advanceRecurringAnchorOnPurchase(
    tx: Executor,
    householdId: string,
    itemName: string,
    supplyId: string | null,
    purchasedAt: Date,
  ): Promise<void> {
    const candidates = (await tx.query.recurringShoppingItems!.findMany({
      where: and(
        eq(recurringShoppingItems.householdId, householdId),
        eq(recurringShoppingItems.state, 'active'),
      ),
    })) as Array<{ id: string; name: string; supplyId: string | null }>;
    const match =
      (supplyId && candidates.find((c) => c.supplyId === supplyId)) ||
      candidates.find((c) => c.name.toLowerCase() === itemName.toLowerCase());
    if (!match) return;
    await tx.update(recurringShoppingItems)
      .set({ lastPurchaseAt: purchasedAt, updatedAt: this.clock.now() })
      .where(eq(recurringShoppingItems.id, match.id));
  }

  /**
   * D108 suggestion pick — pure evaluation server-side: the ONE supply with
   * ≥2 completed cycles, sane average, no active reminder and no synced
   * dismissal wins (highest cycle count). Supply events are read per
   * candidate; households with few supplies make this cheap.
   */
  async suggestRecurringItem(
    householdId: string,
  ): Promise<{
    supplyId: string;
    name: string;
    avgCycleDays: number;
    lastPurchaseAt: string | null;
  } | null> {
    const allSupplies = await this.uow.exec.query.supplies!.findMany({
      where: eq(supplies.householdId, householdId),
    });
    if (allSupplies.length === 0) return null;
    const reminders = await this.uow.exec.query.recurringShoppingItems!.findMany({
      where: eq(recurringShoppingItems.householdId, householdId),
    });
    const active = reminders.filter((r) => r.archivedAt === null);
    const supplyLinked = new Set(active.map((r) => r.supplyId));
    const dismissed = new Set(
      allSupplies
        .filter((s) => (s as { recurringSuggestionDismissedAt?: Date | null }).recurringSuggestionDismissedAt != null)
        .map((s) => String(s.id)),
    );
    let best: { supplyId: string; name: string; avgCycleDays: number; lastPurchaseAt: string | null; cycles: number } | null =
      null;
    for (const supply of allSupplies) {
      const supplyId = String(supply.id);
      if (supplyLinked.has(supplyId) || dismissed.has(supplyId)) continue;
      const events = await this.uow.exec.query.supplyEvents!.findMany({
        where: and(eq(supplyEvents.householdId, householdId), eq(supplyEvents.supplyId, supplyId)),
      });
      const stats = computeSupplyCycleStats(
        events.map((e) => ({
          type: (e as { type: 'created' | 'restocked' | 'marked_low' | 'marked_out' }).type,
          occurredAt: (e as { occurredAt: Date }).occurredAt,
        })),
        this.clock.now(),
      );
      if (!suggestibleCycle(stats)) continue;
      if (best === null || stats.cycleCount > best.cycles) {
        best = {
          supplyId,
          name: String(supply.name),
          avgCycleDays: stats.avgCycleDays ?? 0,
          lastPurchaseAt: null,
          cycles: stats.cycleCount,
        };
      }
    }
    if (best === null) return null;
    const { cycles: _cycles, ...out } = best;
    return out;
  }

  /** D108 "Don't suggest again" — synced dismissal on the supply row. */
  async dismissRecurringSuggestion(householdId: string, supplyId: string): Promise<void> {
    const supply = await this.uow.exec.query.supplies!.findFirst({
      where: eq(supplies.id, supplyId),
    });
    if (!supply || supply.householdId !== householdId) {
      throw new AppError('NOT_FOUND', 'Supply not found');
    }
    await this.uow.exec
      .update(supplies)
      .set({ recurringSuggestionDismissedAt: this.clock.now() })
      .where(eq(supplies.id, supplyId));
  }

  /** Household-scoped fetch; cross-household ids read as NOT_FOUND (§5.8). */
  private async recurringItemRow(
    exec: Executor,
    householdId: string,
    itemId: string,
  ): Promise<RecurringItemRecord> {
    const row = await exec.query.recurringShoppingItems!.findFirst({
      where: eq(recurringShoppingItems.id, itemId),
    });
    if (!row || row.householdId !== householdId) {
      throw new AppError('NOT_FOUND', 'Recurring item not found');
    }
    return recurringItemRowSchema.parse(row);
  }

  /** Household-scoped fetch; cross-household ids read as NOT_FOUND (§5.8). */
  private async shoppingItemRow(
    exec: Executor,
    householdId: string,
    itemId: string,
  ): Promise<ShoppingItemRecord> {
    const row = await exec.query.shoppingItems!.findFirst({
      where: eq(shoppingItems.id, itemId),
    });
    if (!row || row.householdId !== householdId) throw new AppError('NOT_FOUND', 'Shopping item not found');
    return shoppingItemRowSchema.parse(row);
  }
}
