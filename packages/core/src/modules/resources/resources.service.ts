import { eq } from 'drizzle-orm';
import { activityEvents, shoppingItems, supplies } from '@chorify/db';
import { buildActivity } from '../../activity';
import type { Executor, UnitOfWork } from '../../db';
import { AppError } from '../../errors';
import type { Clock } from '../../ports';
import type {
  CreateShoppingItemInput,
  CreateSupplyInput,
  ShoppingItemRecord,
  SupplyRecord,
  UpdateShoppingItemInput,
  UpdateSupplyInput,
} from './resources.schema';
import { shoppingItemRowSchema, supplyRowSchema } from './resources.schema';
import { purchaseGuard, supplyActivityType } from './resources.rules';

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
    }
    return supplyRowSchema.parse(updated);
  }

  // — shopping list —

  async listShoppingItems(householdId: string): Promise<ShoppingItemRecord[]> {
    const rows = await this.uow.exec.query.shoppingItems!.findMany({
      where: eq(shoppingItems.householdId, householdId),
    });
    return rows.map((row) => shoppingItemRowSchema.parse(row));
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
        await tx.update(supplies)
          .set({ state: 'available' })
          .where(eq(supplies.id, item.sourceSupplyId));
      }
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
