import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { households } from './households.model';

export const supplies = pgTable(
  'supplies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    name: text('name').notNull(),
    state: text('state').$type<'available' | 'low' | 'out'>().notNull().default('available'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('supplies_household_id_idx').on(t.householdId)],
);

export const shoppingItems = pgTable(
  'shopping_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    name: text('name').notNull(),
    quantityText: text('quantity_text'),
    category: text('category'),
    sourceSupplyId: uuid('source_supply_id').references((): AnyPgColumn => supplies.id),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('shopping_items_household_id_idx').on(t.householdId),
    index('shopping_items_source_supply_id_idx').on(t.sourceSupplyId),
  ],
);

export type Supply = typeof supplies.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

