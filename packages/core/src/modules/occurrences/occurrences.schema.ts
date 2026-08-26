import { z } from 'zod';

export const occurrenceStatusSchema = z.enum(['pending', 'completed', 'skipped', 'missed']);

const subtaskStateSchema = z.object({
  done: z.boolean(),
  personId: z.string().uuid().nullable(),
});

export const subtaskStatesSchema = z.record(z.string(), subtaskStateSchema);

export const occurrenceRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  responsibilityId: z.string().uuid(),
  ruleId: z.string().uuid(),
  dueDate: z.string(),
  personIds: z.array(z.string().uuid()),
  status: occurrenceStatusSchema,
  completedByPersonId: z.string().uuid().nullable(),
  completedAt: z.date().nullable(),
  note: z.string().nullable(),
  proofPath: z.string().nullable(),
  skipReason: z.string().nullable(),
  subtaskStates: subtaskStatesSchema,
  createdAt: z.date(),
});

/** PATCH /occurrences/:id body (§4.14) — discriminated on `action`. */
export const occurrenceActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('complete'), note: z.string().max(500).optional() }),
  z.object({ action: z.literal('skip'), skipReason: z.string().max(200).optional() }),
  z.object({ action: z.literal('reopen') }),
  z.object({ action: z.literal('reassign'), personIds: z.array(z.string().uuid()).min(1) }),
]);

export type OccurrenceStatus = z.infer<typeof occurrenceStatusSchema>;
export type OccurrenceRecord = z.infer<typeof occurrenceRowSchema>;
export type OccurrenceAction = z.infer<typeof occurrenceActionSchema>;
