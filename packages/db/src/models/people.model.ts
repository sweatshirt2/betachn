import { date, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { households } from './households.model';
import { roles } from './roles.model';

/** Household member identity. Person ≠ account (CN §4) — accounts live in users. */
export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id')
    .notNull()
    .references(() => households.id),
  name: text('name').notNull(),
  sex: text('sex').$type<'male' | 'female'>(),
  birthDate: date('birth_date'),
  age: integer('age'),
  avatarEmoji: text('avatar_emoji').notNull().default('🙂'),
  roleId: uuid('role_id').references(() => roles.id),
  permissionOverrides: jsonb('permission_overrides')
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  phone: text('phone'),
  language: text('language'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Person = typeof people.$inferSelect;
