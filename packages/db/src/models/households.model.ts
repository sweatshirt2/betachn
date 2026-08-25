import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Root entity: everything else belongs to a household (CN §3).
 * Calendar display preference deliberately lives device-side, not here.
 */
export const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  currency: text('currency').notNull().default('ETB'),
  timezone: text('timezone').notNull().default('Africa/Addis_Ababa'),
  lastExportAt: timestamp('last_export_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Household = typeof households.$inferSelect;
