import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Root entity: everything else belongs to a household (CN §3).
 * Calendar display preference deliberately lives device-side, not here.
 * `code` is the 6-letter login/share identifier (D52); syncedAt null marks
 * an offline-only household that has never touched the server.
 */
export const households = pgTable(
  'households',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    currency: text('currency').notNull().default('ETB'),
    timezone: text('timezone').notNull().default('Africa/Addis_Ababa'),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    lastExportAt: timestamp('last_export_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('households_code_key').on(t.code)],
);

export type Household = typeof households.$inferSelect;
