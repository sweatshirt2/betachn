import { z } from 'zod';

export const sexSchema = z.enum(['male', 'female']);

export const createPersonSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sex: sexSchema.nullish(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  /** Stored only when birthDate unknown; suggestions never authorization (§6.9). */
  age: z.number().int().min(0).max(120).nullish(),
  avatarEmoji: z.string().max(8).optional(),
  roleId: z.string().uuid().nullish(),
  /** Contact info — duplicates legal, optional for minors (D55). */
  phone: z.string().max(20).nullish(),
});

export const updatePersonSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  sex: sexSchema.nullable().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  age: z.number().int().min(0).max(120).nullable().optional(),
  avatarEmoji: z.string().max(8).optional(),
  /** Role reassignment triggers promotion/LAST_OWNER gates in the service. */
  roleId: z.string().uuid().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  language: z.string().max(10).nullable().optional(),
  permissionOverrides: z.record(z.string(), z.boolean()).optional(),
});

export const personRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  sex: sexSchema.nullable(),
  birthDate: z.string().nullable(),
  age: z.number().int().nullable(),
  avatarEmoji: z.string(),
  roleId: z.string().uuid().nullable(),
  permissionOverrides: z.record(z.string(), z.boolean()),
  phone: z.string().nullable(),
  language: z.string().nullable(),
  createdAt: z.date(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type PersonRecord = z.infer<typeof personRowSchema>;
