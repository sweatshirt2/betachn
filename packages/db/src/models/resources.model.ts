import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
    /** D108 "Don't suggest again" — synced dismissal of the reminder card. */
    recurringSuggestionDismissedAt: timestamp('recurring_suggestion_dismissed_at', {
      withTimezone: true,
    }),
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

/**
 * Supply event log (§4A.1 / D102) — run-out / low / restock history powering
 * consumption-cycle stats. Deliberately NOT activity_events: the 90-day
 * activity prune would decay the data frequency analysis depends on.
 * clientUuid = sync idempotency (client uuid IS the idempotency key, D59).
 */
export const supplyEvents = pgTable(
  'supply_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    supplyId: uuid('supply_id')
      .notNull()
      .references(() => supplies.id),
    actorPersonId: uuid('actor_person_id'),
    type: text('type')
      .$type<'created' | 'restocked' | 'marked_low' | 'marked_out'>()
      .notNull(),
    source: text('source').$type<'manual' | 'purchase'>().notNull().default('manual'),
    quantityText: text('quantity_text'),
    note: text('note'),
    clientUuid: text('client_uuid'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('supply_events_household_id_idx').on(t.householdId),
    index('supply_events_supply_id_idx').on(t.supplyId),
    uniqueIndex('supply_events_client_uuid_key').on(t.clientUuid).where(sql`client_uuid is not null`),
  ],
);

export type Supply = typeof supplies.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type SupplyEvent = typeof supplyEvents.$inferSelect;

/**
 * Recurring buy reminders (§4A.3 / D108–D110). Anchor (lastPurchaseAt)
 * advances ONLY on a recorded purchase/restock — never on schedule.
 */
export const recurringShoppingItems = pgTable(
  'recurring_shopping_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    name: text('name').notNull(),
    supplyId: uuid('supply_id').references(() => supplies.id),
    intervalDays: integer('interval_days').notNull(),
    quantityText: text('quantity_text'),
    note: text('note'),
    lastPurchaseAt: timestamp('last_purchase_at', { withTimezone: true }),
    snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
    state: text('state').$type<'active' | 'paused'>().notNull().default('active'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdByPersonId: uuid('created_by_person_id'),
    clientUuid: text('client_uuid'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('recurring_shopping_items_household_id_idx').on(t.householdId),
    uniqueIndex('recurring_shopping_items_client_uuid_key').on(t.clientUuid).where(sql`client_uuid is not null`),
  ],
);

export type RecurringShoppingItem = typeof recurringShoppingItems.$inferSelect;

