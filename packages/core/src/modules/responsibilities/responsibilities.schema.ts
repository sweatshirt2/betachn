import { z } from 'zod';
import { ruleShapeIssues, type RuleShapeInput } from './responsibilities.rules';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const schedulePatternSchema = z.enum([
  'once', 'daily', 'every_n_days', 'weekly', 'every_n_weeks', 'monthly', 'dates', 'range',
]);

export const rotationSchema = z.object({
  periodDays: z.number().int().min(1).max(366),
  personIds: z.array(z.string().uuid()).min(1),
});

/** Wire contract for assignment_rules — pattern fields validated in rules.ts. */
export const ruleInputSchema = z
  .object({
    pattern: schedulePatternSchema,
    interval: z.number().int().min(1).max(365).nullish(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).nullish(),
    /** Phase anchor for every_n_days / every_n_weeks / rotation (§6.15). */
    anchorDate: isoDate.nullish(),
    monthDay: z.number().int().min(1).max(31).nullish(),
    dates: z.array(isoDate).nullish(),
    startDate: isoDate,
    endDate: isoDate.nullish(),
    rotation: rotationSchema.nullish(),
    /** Empty array = household-wide claimable (§6.3). */
    personIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((rule, ctx) => {
    for (const issue of ruleShapeIssues(rule as RuleShapeInput)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
    }
  });

export const subtaskInputSchema = z.object({
  title: z.string().trim().min(1).max(140),
  sortOrder: z.number().int().optional(),
  assigneePersonId: z.string().uuid().nullish(),
});

/** Stored subtask row (detail reads — inputs above are write-only). */
export const subtaskRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  sortOrder: z.number().int(),
  assigneePersonId: z.string().uuid().nullable(),
});

/** Stored rule row (detail reads). */
export const ruleRowSchema = z.object({
  id: z.string().uuid(),
  pattern: schedulePatternSchema,
  interval: z.number().int().nullable(),
  daysOfWeek: z.array(z.number().int()).nullable(),
  anchorDate: z.string().nullable(),
  monthDay: z.number().int().nullable(),
  dates: z.array(z.string()).nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  rotation: rotationSchema.nullable(),
  personIds: z.array(z.string().uuid()),
  active: z.boolean(),
});

export const createResponsibilitySchema = z.object({
  title: z.string().trim().min(1).max(140),
  notes: z.string().max(2000).nullish(),
  routineId: z.string().uuid().nullish(),
  roomId: z.string().uuid().nullish(),
  icon: z.string().max(8).optional(),
  subtasks: z.array(subtaskInputSchema).default([]),
  rules: z.array(ruleInputSchema).min(1),
});

/**
 * PATCH semantics: provided `subtasks`/`rules` REPLACE the existing sets and
 * trigger forward regeneration; `archived` toggles archive state (§6.1/§6.10).
 */
export const updateResponsibilitySchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  notes: z.string().max(2000).nullable().optional(),
  routineId: z.string().uuid().nullable().optional(),
  roomId: z.string().uuid().nullable().optional(),
  icon: z.string().max(8).optional(),
  archived: z.boolean().optional(),
  subtasks: z.array(subtaskInputSchema).optional(),
  rules: z.array(ruleInputSchema).optional(),
});

export const responsibilityRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  title: z.string(),
  notes: z.string().nullable(),
  routineId: z.string().uuid().nullable(),
  roomId: z.string().uuid().nullable(),
  archivedAt: z.date().nullable(),
  createdByPersonId: z.string().uuid().nullable(),
  icon: z.string(),
  createdAt: z.date(),
});

export type RuleInput = z.infer<typeof ruleInputSchema>;
export type SubtaskInput = z.infer<typeof subtaskInputSchema>;
export type SubtaskRecord = z.infer<typeof subtaskRowSchema>;
export type RuleRecord = z.infer<typeof ruleRowSchema>;
export type ResponsibilityDetail = {
  responsibility: ResponsibilityRecord;
  subtasks: SubtaskRecord[];
  rules: RuleRecord[];
};
export type CreateResponsibilityInput = z.infer<typeof createResponsibilitySchema>;
export type UpdateResponsibilityInput = z.infer<typeof updateResponsibilitySchema>;
export type ResponsibilityRecord = z.infer<typeof responsibilityRowSchema>;
