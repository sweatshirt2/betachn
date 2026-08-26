import { z } from 'zod';

/** YYYY-MM-DD calendar date (device-local, stored as text). */
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date');

// ── Rooms ────────────────────────────────────────────────────────────────────

export const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(60),
  icon: z.string().max(8).optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

export const roomRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  icon: z.string(),
  createdAt: z.date(),
});

// ── Assets ───────────────────────────────────────────────────────────────────

export const createAssetSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().max(8).optional(),
  roomId: z.string().uuid().nullish(),
  maintenanceIntervalDays: z.number().int().min(1).max(3650).nullish(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const assetRowSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  roomId: z.string().uuid().nullable(),
  name: z.string(),
  icon: z.string(),
  maintenanceIntervalDays: z.number().int().nullable(),
  createdAt: z.date(),
});

// ── Service records ──────────────────────────────────────────────────────────

export const addServiceRecordSchema = z.object({
  servicedOn: isoDateSchema,
  notes: z.string().max(500).nullish(),
});

export const serviceRecordRowSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  servicedOn: isoDateSchema,
  note: z.string().nullable(),
  createdAt: z.date(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type RoomRecord = z.infer<typeof roomRowSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetRecord = z.infer<typeof assetRowSchema>;
export type AddServiceRecordInput = z.infer<typeof addServiceRecordSchema>;
export type ServiceRecordRecord = z.infer<typeof serviceRecordRowSchema>;
