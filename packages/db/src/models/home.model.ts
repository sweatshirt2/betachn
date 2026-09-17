import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { households } from './households.model';

export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    name: text('name').notNull(),
    icon: text('icon').notNull().default('door'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('rooms_household_id_idx').on(t.householdId)],
);

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    roomId: uuid('room_id').references((): AnyPgColumn => rooms.id),
    name: text('name').notNull(),
    icon: text('icon').notNull().default('wrench'),
    maintenanceIntervalDays: integer('maintenance_interval_days'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('assets_household_id_idx').on(t.householdId),
    index('assets_room_id_idx').on(t.roomId),
  ],
);

/** Next-due = max(serviced_on) + asset.maintenance_interval_days. */
export const serviceRecords = pgTable(
  'service_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    servicedOn: text('serviced_on').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('service_records_asset_id_idx').on(t.assetId)],
);

export type Room = typeof rooms.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
