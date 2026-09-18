import { z } from 'zod';

export const supplyStateSchema = z.enum(['available', 'low', 'out']);

export const createSupplySchema = z.object({
  name: z.string().trim().min(1).max(80),
  state: supplyStateSchema.default('available'),
  note: z.string().nullish(),
});

export const updateSupplySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  state: supplyStateSchema.optional(),
  note: z.string().nullish(),
  /** D102: optional free-text restock quantity ("1 packet"), display-only. */
  quantityText: z.string().trim().max(40).nullish(),
});

export const createShoppingItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantityText: z.string().max(40).nullish(),
  category: z.string().max(40).nullish(),
  sourceSupplyId: z.string().uuid().nullish(),
});

export const updateShoppingItemSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  quantityText: z.string().max(40).nullish(),
  category: z.string().max(40).nullish(),
  sourceSupplyId: z.string().uuid().nullish(),
});

export const supplyEventTypeSchema = z.enum(['created', 'restocked', 'marked_low', 'marked_out']);
export const supplyEventSourceSchema = z.enum(['manual', 'purchase']);

export const createSupplyEventSchema = z.object({
  type: supplyEventTypeSchema,
  source: supplyEventSourceSchema.default('manual'),
  quantityText: z.string().trim().max(40).nullish(),
  note: z.string().max(240).nullish(),
  occurredAt: z.coerce.date().optional(),
});

export const updateSupplyEventSchema = z.object({
  quantityText: z.string().trim().max(40).nullish(),
  note: z.string().max(240).nullish(),
});

/** Mirrors packages/db/src/models/resources.model.ts `supply_events`. */
export const supplyEventRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  supplyId: z.string().uuid(),
  actorPersonId: z.string().uuid().nullable(),
  type: supplyEventTypeSchema,
  source: supplyEventSourceSchema,
  quantityText: z.string().nullable(),
  note: z.string().nullable(),
  clientUuid: z.string().nullable(),
  occurredAt: z.date(),
  createdAt: z.date(),
});

/** Mirrors packages/db/src/models/resources.model.ts `supplies`. */
export const supplyRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  state: supplyStateSchema,
  note: z.string().nullable(),
  createdAt: z.date(),
});

/** Mirrors packages/db/src/models/resources.model.ts `shopping_items`. */
export const shoppingItemRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  quantityText: z.string().nullable(),
  category: z.string().nullable(),
  sourceSupplyId: z.string().uuid().nullable(),
  purchasedAt: z.date().nullable(),
  /** Manual drag order (D115): sparse decimals; null = created before the feature. */
  sortKey: z.number().nullable(),
  createdAt: z.date(),
});

/** POST /shopping/reorder (D115): assign the dragged item a position between neighbors. */
export const reorderShoppingItemSchema = z.object({
  itemId: z.string().uuid(),
  /** Positioning anchor: place before/after this item's sortKey. */
  beforeItemId: z.string().uuid().nullish(),
  afterItemId: z.string().uuid().nullish(),
  clientUuid: z.string().min(8).max(64).optional(),
});

export type SupplyState = z.infer<typeof supplyStateSchema>;
export type SupplyEventType = z.infer<typeof supplyEventTypeSchema>;
export type SupplyEventSource = z.infer<typeof supplyEventSourceSchema>;
export type CreateSupplyEventInput = z.infer<typeof createSupplyEventSchema>;
export type UpdateSupplyEventInput = z.infer<typeof updateSupplyEventSchema>;
export type SupplyEventRecord = z.infer<typeof supplyEventRowSchema>;
export type CreateSupplyInput = z.infer<typeof createSupplySchema>;
export type UpdateSupplyInput = z.infer<typeof updateSupplySchema>;
export type CreateShoppingItemInput = z.infer<typeof createShoppingItemSchema>;
export type UpdateShoppingItemInput = z.infer<typeof updateShoppingItemSchema>;
export type SupplyRecord = z.infer<typeof supplyRowSchema>;
export type ShoppingItemRecord = z.infer<typeof shoppingItemRowSchema>;
export type ReorderShoppingItemInput = z.infer<typeof reorderShoppingItemSchema>;

/**
 * Recurring buy reminders (§4A.3 / D108–D110): REMINDERS ONLY — never an
 * assumed purchase. Anchor advances solely on a recorded purchase/restock.
 * Cadence is day-interval only; due = lastPurchaseAt + intervalDays.
 */
export const recurringStateSchema = z.enum(['active', 'paused']);
export const createRecurringItemSchema = z.object({
  name: z.string().trim().min(1).max(140),
  supplyId: z.string().uuid().nullish(),
  intervalDays: z.number().int().min(3).max(365),
  quantityText: z.string().max(100).nullish(),
  note: z.string().max(500).nullish(),
  lastBoughtOn: z.date().nullish(),
});
export const updateRecurringItemSchema = z.object({
  name: z.string().trim().min(1).max(140).optional(),
  intervalDays: z.number().int().min(3).max(365).optional(),
  quantityText: z.string().max(100).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  state: recurringStateSchema.optional(),
});
export const snoozeRecurringItemSchema = z.object({ days: z.number().int().min(1).max(30).default(3) });
export const recurringItemRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  supplyId: z.string().uuid().nullable(),
  intervalDays: z.number().int().min(3).max(365),
  quantityText: z.string().nullable(),
  note: z.string().nullable(),
  lastPurchaseAt: z.date().nullable(),
  snoozedUntil: z.date().nullable(),
  state: recurringStateSchema,
  archivedAt: z.date().nullable(),
  createdByPersonId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type RecurringState = z.infer<typeof recurringStateSchema>;
export type CreateRecurringItemInput = z.infer<typeof createRecurringItemSchema>;
export type UpdateRecurringItemInput = z.infer<typeof updateRecurringItemSchema>;
export type RecurringItemRecord = z.infer<typeof recurringItemRowSchema>;
