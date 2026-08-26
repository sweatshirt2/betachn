import { z } from 'zod';

export const createHouseholdSchema = z.object({
  name: z.string().trim().min(1).max(80),
  currency: z.string().trim().min(1).max(8).default('ETB'),
  timezone: z.string().trim().min(1).max(60).default('Africa/Addis_Ababa'),
});

export const updateHouseholdSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  timezone: z.string().trim().min(1).max(60).optional(),
});

export const householdRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  currency: z.string(),
  timezone: z.string(),
  /** null = offline-only household that has never touched the server (D49). */
  syncedAt: z.date().nullable(),
  lastExportAt: z.date().nullable(),
  createdAt: z.date(),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
export type HouseholdRecord = z.infer<typeof householdRowSchema>;
