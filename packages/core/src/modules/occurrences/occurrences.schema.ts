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

/** List wire shape (§4.14): occurrence row + responsibility title/icon join. */
export const titledOccurrenceSchema = occurrenceRowSchema.extend({
  title: z.string().min(1),
  /** Responsibility icon (legacy emoji or glyph key) — clients render a tile. */
  icon: z.string().nullable(),
});
export type TitledOccurrenceRecord = z.infer<typeof titledOccurrenceSchema>;

/**
 * Proof photos (§4A.2 / D104–D107) — the wire contract. The blob goes to
 * POST /uploads (raw image bytes, Content-Type header carries the format);
 * the returned key is bound to the occurrence via the proof-bind mutation.
 * Serving is the auth-checked GET /occurrences/:id/proof/:proofId proxy.
 */
export const proofBindSchema = z.object({
  key: z.string().min(1).max(512).regex(/^hh\/[0-9a-fA-F-]+\/proof\/[0-9a-fA-F-]+\/[0-9a-fA-F-]+\.jpg$/),
});
export type ProofBindInput = z.infer<typeof proofBindSchema>;

export const occurrenceProofRowSchema = z.object({
  id: z.string().uuid(),
  occurrenceId: z.string().uuid(),
  key: z.string().min(1),
  uploadedByPersonId: z.string().uuid().nullable(),
  createdAt: z.date(),
});
export type OccurrenceProofRecord = z.infer<typeof occurrenceProofRowSchema>;
