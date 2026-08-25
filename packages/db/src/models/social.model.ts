import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { households } from './households.model';
import { people } from './people.model';

/**
 * Story-feed events. `type` + `params` are i18n KEYS, never prose — clients
 * localize historical entries. `domain` is the permission visibility gate.
 */
export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    actorPersonId: uuid('actor_person_id').references(() => people.id),
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    domain: text('domain')
      .$type<'household' | 'responsibilities' | 'finances' | 'home' | 'resources'>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('activity_events_household_created_idx').on(t.householdId, t.createdAt)],
);

/** In-app notifications; paramsJson carries i18n interpolation params. */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    recipientPersonId: uuid('recipient_person_id')
      .notNull()
      .references(() => people.id),
    category: text('category')
      .$type<'assignment' | 'reminder' | 'completion' | 'missed' | 'finance' | 'bill' | 'backup'>()
      .notNull(),
    type: text('type').notNull(),
    paramsJson: jsonb('params_json').$type<Record<string, unknown>>().notNull().default({}),
    linkPath: text('link_path'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('notifications_unread_recipient_idx')
      .on(t.recipientPersonId)
      .where(sql`read_at is null`),
  ],
);

/** Per-person category toggles; defaults all-true except finance/bill false. */
export const notificationPrefs = pgTable('notification_prefs', {
  personId: uuid('person_id')
    .primaryKey()
    .references(() => people.id),
  categories: jsonb('categories')
    .$type<Partial<Record<'assignment' | 'reminder' | 'completion' | 'missed' | 'finance' | 'bill' | 'backup', boolean>>>()
    .notNull()
    .default({}),
});

/** Worker bookkeeping surfaced by GET /admin/jobs. */
export const jobsAudit = pgTable('jobs_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ranAt: timestamp('ran_at', { withTimezone: true }).notNull().defaultNow(),
  result: jsonb('result').$type<Record<string, unknown>>().notNull().default({}),
});

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NotificationPref = typeof notificationPrefs.$inferSelect;
export type JobAuditEntry = typeof jobsAudit.$inferSelect;
