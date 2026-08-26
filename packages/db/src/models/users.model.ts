import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { households } from './households.model';
import { people } from './people.model';

/**
 * Credential rows. Person WITH a user row = credentialed identity
 * (password-gated profile switching); person WITHOUT = passwordless
 * quick-switch profile. Max ONE user per person (unique person_id).
 *
 * - passwordHash is nullable: Google-only accounts may have no local
 *   password until they set one (D50).
 * - phone is the GLOBALLY UNIQUE recovery credential (D55) — distinct
 *   from people.phone which is free-duplicate contact info.
 * - Username uniqueness is per household, case-insensitive (D53):
 *   UNIQUE (household_id, lower(username)).
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username'),
    passwordHash: text('password_hash'),
    phone: text('phone'),
    personId: uuid('person_id').references(() => people.id),
    householdId: uuid('household_id').references(() => households.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_household_username_key').on(t.householdId, sql`lower(${t.username})`),
    uniqueIndex('users_person_id_key').on(t.personId),
    uniqueIndex('users_phone_key').on(t.phone),
  ],
);

export type User = typeof users.$inferSelect;
