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

/**
 * Supply event log mirror (§4A.1 / D102) — consumption-cycle history.
 * clientUuid unique-nullable mirrors the pg partial index so device-originated
 * events push idempotently and server-made events (null uuid) pull cleanly.
 */
export const supplyEvents = sqliteTable('supply_events', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  supplyId: text('supply_id')
    .notNull()
    .references(() => supplies.id),
  actorPersonId: text('actor_person_id'),
  type: text('type', { enum: ['created', 'restocked', 'marked_low', 'marked_out'] }).notNull(),
  source: text('source', { enum: ['manual', 'purchase'] }).notNull().default('manual'),
  quantityText: text('quantity_text'),
  note: text('note'),
  clientUuid: text('client_uuid'),
  occurredAt: text('occurred_at').notNull(),
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
export type SupplyEventRow = typeof supplyEvents.$inferSelect;
