import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { people } from './people.model';
import { users } from './users.model';

/**
 * One session per login; sha256(token) only — raw tokens never persisted.
 * Profile switching mutates activePersonId (+userId when the target person
 * is credentialed) instead of minting new sessions.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    activePersonId: uuid('active_person_id')
      .notNull()
      .references(() => people.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('sessions_token_hash_key').on(t.tokenHash)],
);

export type Session = typeof sessions.$inferSelect;
