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
export type CreateSupplyInput = z.infer<typeof createSupplySchema>;
export type UpdateSupplyInput = z.infer<typeof updateSupplySchema>;
export type CreateShoppingItemInput = z.infer<typeof createShoppingItemSchema>;
export type UpdateShoppingItemInput = z.infer<typeof updateShoppingItemSchema>;
export type SupplyRecord = z.infer<typeof supplyRowSchema>;
export type ShoppingItemRecord = z.infer<typeof shoppingItemRowSchema>;
