import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { households } from './households';

export const supplies = sqliteTable('supplies', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  name: text('name').notNull(),
  state: text('state', { enum: ['available', 'low', 'out'] }).notNull().default('available'),
  note: text('note'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const shoppingItems = sqliteTable('shopping_items', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  name: text('name').notNull(),
  quantityText: text('quantity_text'),
  category: text('category'),
  sourceSupplyId: text('source_supply_id').references(() => supplies.id),
  purchasedAt: text('purchased_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type SupplyRow = typeof supplies.$inferSelect;
export type ShoppingItemRow = typeof shoppingItems.$inferSelect;
