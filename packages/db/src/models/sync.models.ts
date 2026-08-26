import { bigint, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { households } from './households.model';
import { people } from './people.model';

export type ChangeOp = 'create' | 'update' | 'delete';
export type AudienceType = 'members' | 'roles' | 'all';
export type SyncDomain = 'household' | 'responsibilities' | 'finances' | 'home' | 'resources';

/**
 * Authoritative per-household change feed (§4.12 / D59–D61). `seq` is
 * monotonic within a household; audiences stay SYMBOLIC and are evaluated
 * live at pull time against the requester's current roles, plus the
 * permission-domain gate (no indirect leakage — CN XIX-4).
 */
export const householdChanges = pgTable(
  'household_changes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    seq: bigint('seq', { mode: 'number' }).notNull(),
    actorPersonId: uuid('actor_person_id').references(() => people.id),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id').notNull(),
    op: text('op').$type<ChangeOp>().notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    audienceType: text('audience_type').$type<AudienceType>().notNull(),
    audienceIds: jsonb('audience_ids').$type<string[]>().notNull().default([]),
    domain: text('domain').$type<SyncDomain>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('household_changes_seq_key').on(t.householdId, t.seq)],
);

export type HouseholdChange = typeof householdChanges.$inferSelect;
