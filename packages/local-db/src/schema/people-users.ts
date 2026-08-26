import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { households } from './households';
import { roles } from './roles';

/** Person ≠ account (CN §4) — accounts live in the users mirror. */
export const people = sqliteTable('people', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  name: text('name').notNull(),
  sex: text('sex', { enum: ['male', 'female'] }),
  birthDate: text('birth_date'),
  age: integer('age'),
  avatarEmoji: text('avatar_emoji').notNull().default('🙂'),
  roleId: text('role_id').references(() => roles.id),
  permissionOverrides: text('permission_overrides', { mode: 'json' })
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  phone: text('phone'),
  language: text('language'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

/**
 * Credential rows for THIS device's accounts only. Username nullable:
 * Google-first accounts choose usernames later (D50).
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username'),
    passwordHash: text('password_hash'),
    phone: text('phone'),
    personId: text('person_id').references(() => people.id),
    householdId: text('household_id').references(() => households.id),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  },
);

export type PersonRow = typeof people.$inferSelect;
export type UserRow = typeof users.$inferSelect;
