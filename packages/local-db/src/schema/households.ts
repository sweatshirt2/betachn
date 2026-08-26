import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Device mirrors of §4.5 tables (sqlite-core dialect). Conventions:
 * - ids are client-generated uuids (text pk, no db default) so offline
 *   creation works before any sync;
 * - timestamps are ISO-8601 TEXT;
 * - jsonb becomes TEXT with JSON mode;
 * - booleans are INTEGER with boolean mode.
 *
 * Server-only tables are deliberately NOT mirrored: sessions,
 * oauth_accounts, verification_challenges, auth_attempts, blocklist_words,
 * jobs_audit, household_changes. Credential material never lands on shared
 * devices (D55) and the authoritative feed lives server-side — devices hold
 * only their pull cursor in `device_sync_state`.
 */

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  currency: text('currency').notNull().default('ETB'),
  timezone: text('timezone').notNull().default('Africa/Addis_Ababa'),
  syncedAt: text('synced_at'),
  lastExportAt: text('last_export_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type HouseholdRow = typeof households.$inferSelect;
