import { and, eq } from 'drizzle-orm';
import { activityEvents, assets, rooms, serviceRecords } from '@chorify/db';
import { buildActivity } from '../../activity';
import { AppError } from '../../errors';
import type { UnitOfWork } from '../../db';
import {
  assetRowSchema,
  roomRowSchema,
  serviceRecordRowSchema,
  type AddServiceRecordInput,
  type AssetRecord,
  type CreateAssetInput,
  type CreateRoomInput,
  type RoomRecord,
  type ServiceRecordRecord,
  type UpdateAssetInput,
  type UpdateRoomInput,
} from './home.schema';
import { nextMaintenanceDue } from './home.rules';

export { nextMaintenanceDue };

/**
 * Home inventory: rooms → assets → service records. Assets cascade-delete
 * their service records; rooms reject removal while assets still point at
 * them (§5.8 IN_USE).
 */
export class HomeService {
  constructor(private readonly uow: UnitOfWork) {}

  // ── Rooms ────────────────────────────────────────────────────────────────

  async listRooms(householdId: string): Promise<RoomRecord[]> {
    const rows = await this.uow.exec.query.rooms!.findMany({
      where: eq(rooms.householdId, householdId),
    });
    return rows.map((row) => roomRowSchema.parse(row));
  }

  async createRoom(
    actorPersonId: string | null,
    householdId: string,
    input: CreateRoomInput,
  ): Promise<RoomRecord> {
    const [row] = await this.uow.exec
      .insert(rooms)
      .values({ householdId, name: input.name, icon: input.icon ?? '🏠' })
      .returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId,
      actorPersonId,
      ...buildActivity('room.added', { name: input.name }),
    });
    return roomRowSchema.parse(row);
  }

  async updateRoom(
    actorPersonId: string | null,
    householdId: string,
    roomId: string,
    input: UpdateRoomInput,
  ): Promise<RoomRecord> {
    const existing = await this.getRoomRow(householdId, roomId);
    const [updated] = await this.uow.exec
      .update(rooms)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
      })
      .where(eq(rooms.id, roomId))
      .returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId,
      actorPersonId,
      ...buildActivity('room.updated', { name: updated?.name ?? existing.name }),
    });
    return roomRowSchema.parse(updated);
  }

  async removeRoom(actorPersonId: string | null, householdId: string, roomId: string): Promise<void> {
    const existing = await this.getRoomRow(householdId, roomId);
    await this.uow.transact(async (tx) => {
      const used = await tx.query.assets!.findFirst({
        where: eq(assets.roomId, roomId),
        columns: { id: true },
      });
      if (used) throw new AppError('IN_USE', 'Move its assets to another room first');
      await tx.delete(rooms).where(eq(rooms.id, roomId));
      await tx.insert(activityEvents).values({
        householdId,
        actorPersonId,
        ...buildActivity('room.removed', { name: existing.name }),
      });
    });
  }

  // ── Assets ───────────────────────────────────────────────────────────────

  async listAssets(householdId: string): Promise<AssetRecord[]> {
    const rows = await this.uow.exec.query.assets!.findMany({
      where: eq(assets.householdId, householdId),
    });
    return rows.map((row) => assetRowSchema.parse(row));
  }

  /** Next due date per §6 semantics — null when no interval or no history. */
  async nextMaintenanceDueFor(
    householdId: string,
    assetId: string,
    todayIso: string,
  ): Promise<string | null> {
    const asset = await this.getAssetRow(householdId, assetId);
    const records = await this.uow.exec.query.serviceRecords!.findMany({
      where: eq(serviceRecords.assetId, assetId),
      columns: { servicedOn: true },
    });
    // ISO dates sort lexicographically.
    const lastServicedOn = records.reduce<string | null>((acc, row) => {
      const servicedOn = typeof row.servicedOn === 'string' ? row.servicedOn : null;
      return servicedOn !== null && (acc === null || servicedOn > acc) ? servicedOn : acc;
    }, null);
    return nextMaintenanceDue(asset, lastServicedOn, todayIso);
  }

  async createAsset(
    actorPersonId: string | null,
    householdId: string,
    input: CreateAssetInput,
  ): Promise<AssetRecord> {
    if (input.roomId) await this.getRoomRow(householdId, input.roomId);
    const [row] = await this.uow.exec
      .insert(assets)
      .values({
        householdId,
        name: input.name,
        icon: input.icon ?? '🔧',
        roomId: input.roomId ?? null,
        maintenanceIntervalDays: input.maintenanceIntervalDays ?? null,
      })
      .returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId,
      actorPersonId,
      ...buildActivity('asset.added', { name: input.name }),
    });
    return assetRowSchema.parse(row);
  }

  async updateAsset(
    actorPersonId: string | null,
    householdId: string,
    assetId: string,
    input: UpdateAssetInput,
  ): Promise<AssetRecord> {
    if (input.roomId) await this.getRoomRow(householdId, input.roomId);
    const existing = await this.getAssetRow(householdId, assetId);
    const [updated] = await this.uow.exec
      .update(assets)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.roomId !== undefined ? { roomId: input.roomId ?? null } : {}),
        ...(input.maintenanceIntervalDays !== undefined
          ? { maintenanceIntervalDays: input.maintenanceIntervalDays ?? null }
          : {}),
      })
      .where(eq(assets.id, assetId))
      .returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId,
      actorPersonId,
      ...buildActivity('asset.updated', { name: updated?.name ?? existing.name }),
    });
    return assetRowSchema.parse(updated);
  }

  /** Cascade: service records die with their asset (single tx). */
  async removeAsset(
    actorPersonId: string | null,
    householdId: string,
    assetId: string,
  ): Promise<void> {
    const existing = await this.getAssetRow(householdId, assetId);
    await this.uow.transact(async (tx) => {
      await tx.delete(serviceRecords).where(eq(serviceRecords.assetId, assetId));
      await tx.delete(assets).where(eq(assets.id, assetId));
      await tx.insert(activityEvents).values({
        householdId,
        actorPersonId,
        ...buildActivity('asset.removed', { name: existing.name }),
      });
    });
  }

  // ── Service records ──────────────────────────────────────────────────────

  async addServiceRecord(
    actorPersonId: string | null,
    householdId: string,
    assetId: string,
    input: AddServiceRecordInput,
  ): Promise<ServiceRecordRecord> {
    const asset = await this.getAssetRow(householdId, assetId);
    const [row] = await this.uow.exec
      .insert(serviceRecords)
      .values({
        assetId,
        servicedOn: input.servicedOn,
        note: input.notes ?? null,
      })
      .returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId,
      actorPersonId,
      ...buildActivity('asset.serviced', { assetName: asset.name }),
    });
    return serviceRecordRowSchema.parse(row);
  }

  // ── Guards ───────────────────────────────────────────────────────────────

  /** Cross-household ids resolve to NOT_FOUND — existence is never revealed. */
  private async getRoomRow(householdId: string, roomId: string): Promise<RoomRecord> {
    const row = await this.uow.exec.query.rooms!.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)),
    });
    if (!row) throw new AppError('NOT_FOUND', 'Room not found');
    return roomRowSchema.parse(row);
  }

  private async getAssetRow(householdId: string, assetId: string): Promise<AssetRecord> {
    const row = await this.uow.exec.query.assets!.findFirst({
      where: and(eq(assets.id, assetId), eq(assets.householdId, householdId)),
    });
    if (!row) throw new AppError('NOT_FOUND', 'Asset not found');
    return assetRowSchema.parse(row);
  }
}
