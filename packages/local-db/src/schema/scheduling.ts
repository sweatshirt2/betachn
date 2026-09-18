import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { households } from './households';
import { people } from './people-users';
import { rooms } from './home';

export const routines = sqliteTable('routines', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('sun'),
  timeBucket: text('time_bucket', { enum: ['morning', 'afternoon', 'evening', 'anytime'] })
    .notNull()
    .default('anytime'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const responsibilities = sqliteTable('responsibilities', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  title: text('title').notNull(),
  notes: text('notes'),
  routineId: text('routine_id').references(() => routines.id),
  roomId: text('room_id').references(() => rooms.id),
  archivedAt: text('archived_at'),
  createdByPersonId: text('created_by_person_id').references(() => people.id),
  icon: text('icon').notNull().default('pin'),
  /** §4A.2/D107 mirror — required ⇒ completion blocks until ≥1 proof. */
  proofMode: text('proof_mode').notNull().default('optional'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

/** Subtasks carry their own assignees (CN §37). */
export const subtasks = sqliteTable('subtasks', {
  id: text('id').primaryKey(),
  responsibilityId: text('responsibility_id')
    .notNull()
    .references(() => responsibilities.id),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull(),
  assigneePersonId: text('assignee_person_id').references(() => people.id),
});

/**
 * Assignment rules cover every CN §38 type via `pattern`. Rotation array
 * order IS the rotation; anchorDate fixed at creation (§6.15).
 */
export const assignmentRules = sqliteTable('assignment_rules', {
  id: text('id').primaryKey(),
  responsibilityId: text('responsibility_id')
    .notNull()
    .references(() => responsibilities.id),
  pattern: text('pattern', {
    enum: ['once', 'daily', 'every_n_days', 'weekly', 'every_n_weeks', 'monthly', 'dates', 'range'],
  }).notNull(),
  interval: integer('interval'),
  daysOfWeek: text('days_of_week', { mode: 'json' }).$type<number[]>(),
  anchorDate: text('anchor_date'),
  monthDay: integer('month_day'),
  dates: text('dates', { mode: 'json' }).$type<string[]>(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  rotation: text('rotation', { mode: 'json' }).$type<{ periodDays: number; personIds: string[] }>(),
  personIds: text('person_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdByPersonId: text('created_by_person_id').references(() => people.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type OccurrenceSubtaskState = { done: boolean; personId: string | null };

/** UNIQUE (rule_id, due_date) — generator idempotency, mirrored exactly. */
export const occurrences = sqliteTable(
  'occurrences',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    responsibilityId: text('responsibility_id')
      .notNull()
      .references(() => responsibilities.id),
    ruleId: text('rule_id')
      .notNull()
      .references(() => assignmentRules.id),
    dueDate: text('due_date').notNull(),
    personIds: text('person_ids', { mode: 'json' }).$type<string[]>().notNull().default([]),
    status: text('status', { enum: ['pending', 'completed', 'skipped', 'missed'] })
      .notNull()
      .default('pending'),
    completedByPersonId: text('completed_by_person_id').references(() => people.id),
    completedAt: text('completed_at'),
    note: text('note'),
    proofPath: text('proof_path'),
    skipReason: text('skip_reason'),
    subtaskStates: text('subtask_states', { mode: 'json' })
      .$type<Record<string, OccurrenceSubtaskState>>()
      .notNull()
      .default({}),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex('occurrences_rule_due_key').on(t.ruleId, t.dueDate)],
);

export type RoutineRow = typeof routines.$inferSelect;
export type ResponsibilityRow = typeof responsibilities.$inferSelect;
export type SubtaskRow = typeof subtasks.$inferSelect;
export type AssignmentRuleRow = typeof assignmentRules.$inferSelect;
export type OccurrenceRow = typeof occurrences.$inferSelect;

/**
 * Occurrence-level mutual swaps mirror (§16b / D113). Row-level LWW; status
 * transitions ride as updates. Timestamps ISO strings like every mirror row.
 */
export const occurrenceSwaps = sqliteTable('occurrence_swaps', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  occurrenceId: text('occurrence_id')
    .notNull()
    .references(() => occurrences.id),
  fromPersonId: text('from_person_id')
    .notNull()
    .references(() => people.id),
  toPersonId: text('to_person_id')
    .notNull()
    .references(() => people.id),
  status: text('status', { enum: ['pending', 'accepted', 'declined', 'cancelled'] })
    .notNull()
    .default('pending'),
  clientUuid: text('client_uuid'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type OccurrenceSwapRow = typeof occurrenceSwaps.$inferSelect;
