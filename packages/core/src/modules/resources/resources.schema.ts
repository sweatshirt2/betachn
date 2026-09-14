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
  createdAt: z.date(),
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
