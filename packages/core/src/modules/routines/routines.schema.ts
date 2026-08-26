import { z } from 'zod';

export const timeBucketSchema = z.enum(['morning', 'afternoon', 'evening', 'anytime']);

export const createRoutineSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().max(8).optional(),
  timeBucket: timeBucketSchema.optional(),
});

export const updateRoutineSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  icon: z.string().max(8).optional(),
  timeBucket: timeBucketSchema.optional(),
});

export const routineRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  icon: z.string(),
  timeBucket: timeBucketSchema,
  createdAt: z.date(),
});

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;
export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;
export type RoutineRecord = z.infer<typeof routineRowSchema>;
