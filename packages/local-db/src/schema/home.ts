import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { households } from './households';

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('door'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  roomId: text('room_id').references(() => rooms.id),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('wrench'),
  maintenanceIntervalDays: integer('maintenance_interval_days'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

/** Next-due = max(serviced_on) + asset.maintenance_interval_days. */
export const serviceRecords = sqliteTable('service_records', {
  id: text('id').primaryKey(),
  assetId: text('asset_id')
    .notNull()
    .references(() => assets.id),
  servicedOn: text('serviced_on').notNull(),
  note: text('note'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type RoomRow = typeof rooms.$inferSelect;
export type AssetRow = typeof assets.$inferSelect;
export type ServiceRecordRow = typeof serviceRecords.$inferSelect;
