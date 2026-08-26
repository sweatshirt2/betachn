import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.model';

/** One OAuth identity binds to exactly one user (D50). */
export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider').$type<'google'>().notNull().default('google'),
    providerAccountId: text('provider_account_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('oauth_provider_account_key').on(t.provider, t.providerAccountId)],
);

/**
 * Reserved for the SMS/email verification milestone (D51). Codes are
 * stored hashed; unused rows are pruned by a worker job.
 */
export const verificationChallenges = pgTable('verification_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').$type<'sms' | 'email'>().notNull(),
  targetNormalized: text('target_normalized').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Postgres-backed rate limiter buckets (D66) — survives restarts. */
export const authAttempts = pgTable(
  'auth_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identifier: text('identifier').notNull(),
    ip: text('ip').notNull().default(''),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [uniqueIndex('auth_attempts_identifier_ip_window_key').on(t.identifier, t.ip, t.windowStart)],
);

/** Household-code blocklist — seeded data, maintained without redeploys (D52). */
export const blocklistWords = pgTable('blocklist_words', {
  word: text('word').primaryKey(),
});

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type VerificationChallenge = typeof verificationChallenges.$inferSelect;
export type AuthAttempt = typeof authAttempts.$inferSelect;
export type BlocklistWord = typeof blocklistWords.$inferSelect;
