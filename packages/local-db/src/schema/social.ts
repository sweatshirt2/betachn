import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { households } from './households';
import { people } from './people-users';

/** Story-feed events; type+payload stay i18n keys/snapshots, never prose. */
export const activityEvents = sqliteTable('activity_events', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  actorPersonId: text('actor_person_id').references(() => people.id),
  type: text('type').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  domain: text('domain', {
    enum: ['household', 'responsibilities', 'finances', 'home', 'resources'],
  }).notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  recipientPersonId: text('recipient_person_id')
    .notNull()
    .references(() => people.id),
  category: text('category', {
    enum: ['assignment', 'reminder', 'completion', 'missed', 'finance', 'bill', 'backup'],
  }).notNull(),
  type: text('type').notNull(),
  paramsJson: text('params_json', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  linkPath: text('link_path'),
  readAt: text('read_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

/** Partial per-person toggles; defaults handled by core notify kernel. */
export const notificationPrefs = sqliteTable('notification_prefs', {
  personId: text('person_id')
    .primaryKey()
    .references(() => people.id),
  categories: text('categories', { mode: 'json' })
    .$type<Partial<Record<string, boolean>>>()
    .notNull()
    .default({}),
});

export type ActivityEventRow = typeof activityEvents.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type NotificationPrefsRow = typeof notificationPrefs.$inferSelect;
