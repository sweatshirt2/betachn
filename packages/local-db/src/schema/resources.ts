import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { households } from './households';

export const supplies = sqliteTable('supplies', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  name: text('name').notNull(),
  state: text('state', { enum: ['available', 'low', 'out'] }).notNull().default('available'),
  note: text('note'),
  recurringSuggestionDismissedAt: text('recurring_suggestion_dismissed_at'),
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

/**
 * Recurring buy reminders mirror (§4A.3 / D108–D110) — REMINDERS ONLY.
 * Anchor (lastPurchaseAt) advances solely via a recorded purchase op;
 * nothing in the device ever schedule-advances it (micro-74). Timestamps
 * ride as ISO strings like every other mirror row (LWW compare in the
 * applier is lexicographic-safe on ISO-8601 UTC).
 */
export const recurringShoppingItems = sqliteTable('recurring_shopping_items', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  name: text('name').notNull(),
  supplyId: text('supply_id').references(() => supplies.id),
  intervalDays: integer('interval_days').notNull(),
  quantityText: text('quantity_text'),
  note: text('note'),
  lastPurchaseAt: text('last_purchase_at'),
  snoozedUntil: text('snoozed_until'),
  state: text('state', { enum: ['active', 'paused'] }).notNull().default('active'),
  archivedAt: text('archived_at'),
  createdByPersonId: text('created_by_person_id'),
  clientUuid: text('client_uuid'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type SupplyRow = typeof supplies.$inferSelect;
export type ShoppingItemRow = typeof shoppingItems.$inferSelect;
export type SupplyEventRow = typeof supplyEvents.$inferSelect;
export type RecurringShoppingItemRow = typeof recurringShoppingItems.$inferSelect;
