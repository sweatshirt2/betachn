import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Device-local settings — deliberately NOT a mirror of any server table
 * (households.ts header rationale): this is per-DEVICE state about the data
 * on THIS device, which the server must never see. Key/value with JSON
 * values keeps future device-only concerns (passcode gate, encryption
 * envelope, last-audit marks) out of the mirror shape.
 */
export const device_settings = sqliteTable('device_settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type DeviceSettingRow = typeof device_settings.$inferSelect;
