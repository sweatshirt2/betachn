import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { households } from './households.model';
import { people } from './people.model';

/**
 * Credential rows. Person WITH a user row = credentialed identity
 * (password-gated profile switching); person WITHOUT = passwordless
 * quick-switch profile. Max ONE user per person (unique person_id).
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    personId: uuid('person_id').references(() => people.id),
    householdId: uuid('household_id').references(() => households.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_username_key').on(t.username),
    uniqueIndex('users_person_id_key').on(t.personId),
  ],
);

export type User = typeof users.$inferSelect;
