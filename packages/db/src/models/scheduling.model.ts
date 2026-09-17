import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { households } from './households.model';
import { people } from './people.model';
import { rooms } from './home.model';

export const routines = pgTable(
  'routines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    name: text('name').notNull(),
    icon: text('icon').notNull().default('🌅'),
    timeBucket: text('time_bucket')
      .$type<'morning' | 'afternoon' | 'evening' | 'anytime'>()
      .notNull()
      .default('anytime'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('routines_household_id_idx').on(t.householdId)],
);

export const responsibilities = pgTable(
  'responsibilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    title: text('title').notNull(),
    notes: text('notes'),
    routineId: uuid('routine_id').references(() => routines.id),
    roomId: uuid('room_id').references(() => rooms.id),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdByPersonId: uuid('created_by_person_id').references(() => people.id),
    icon: text('icon').notNull().default('📌'),
    /** §4A.2/D107: required ⇒ completion blocks until ≥1 proof exists. */
    proofMode: text('proof_mode').$type<'optional' | 'required'>().notNull().default('optional'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('responsibilities_household_id_idx').on(t.householdId),
    index('responsibilities_routine_id_idx').on(t.routineId),
    index('responsibilities_room_id_idx').on(t.roomId),
  ],
);

export const subtasks = pgTable(
  'subtasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    responsibilityId: uuid('responsibility_id')
      .notNull()
      .references(() => responsibilities.id),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull(),
    assigneePersonId: uuid('assignee_person_id').references(() => people.id),
  },
  (t) => [index('subtasks_responsibility_id_idx').on(t.responsibilityId)],
);

/**
 * Assignment rules cover every CN §38 type via `pattern`. Rotation array
 * order IS the rotation; anchorDate is fixed at creation so membership
 * edits never rewrite the past (§6.15).
 */
export const assignmentRules = pgTable(
  'assignment_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    responsibilityId: uuid('responsibility_id')
      .notNull()
      .references(() => responsibilities.id),
    pattern: text('pattern')
      .$type<
        | 'once'
        | 'daily'
        | 'every_n_days'
        | 'weekly'
        | 'every_n_weeks'
        | 'monthly'
        | 'dates'
        | 'range'
      >()
      .notNull(),
    interval: integer('interval'),
    daysOfWeek: jsonb('days_of_week').$type<number[]>(),
    anchorDate: date('anchor_date'),
    monthDay: integer('month_day'),
    dates: jsonb('dates').$type<string[]>(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    rotation: jsonb('rotation').$type<{ periodDays: number; personIds: string[] }>(),
    personIds: jsonb('person_ids').$type<string[]>().notNull().default([]),
    active: boolean('active').notNull().default(true),
    createdByPersonId: uuid('created_by_person_id').references(() => people.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('assignment_rules_responsibility_id_idx').on(t.responsibilityId)],
);

export type OccurrenceSubtaskState = { done: boolean; personId: string | null };

/**
 * Materialized chores. UNIQUE (rule_id, due_date) makes generator reruns
 * idempotent (§4.8/§6.16). Empty personIds = household-wide claimable.
 */
export const occurrences = pgTable(
  'occurrences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    responsibilityId: uuid('responsibility_id')
      .notNull()
      .references(() => responsibilities.id),
    ruleId: uuid('rule_id')
      .notNull()
      .references(() => assignmentRules.id),
    dueDate: date('due_date').notNull(),
    personIds: jsonb('person_ids').$type<string[]>().notNull().default([]),
    status: text('status')
      .$type<'pending' | 'completed' | 'skipped' | 'missed'>()
      .notNull()
      .default('pending'),
    completedByPersonId: uuid('completed_by_person_id').references(() => people.id),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    note: text('note'),
    proofPath: text('proof_path'),
    skipReason: text('skip_reason'),
    subtaskStates: jsonb('subtask_states')
      .$type<Record<string, OccurrenceSubtaskState>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('occurrences_rule_due_key').on(t.ruleId, t.dueDate),
    index('occurrences_household_due_idx').on(t.householdId, t.dueDate),
    index('occurrences_pending_due_idx')
      .on(t.dueDate)
      .where(sql`status = 'pending'`),
  ],
);

export type Routine = typeof routines.$inferSelect;
export type Responsibility = typeof responsibilities.$inferSelect;
export type Subtask = typeof subtasks.$inferSelect;
export type AssignmentRule = typeof assignmentRules.$inferSelect;
export type Occurrence = typeof occurrences.$inferSelect;
