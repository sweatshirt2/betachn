import { eq } from 'drizzle-orm';
import { activityEvents, households, roles } from '@chorify/db';
import { buildActivity } from '../../activity';
import { AppError } from '../../errors';
import type { BlocklistChecker, RandomSource } from '../../ports';
import type { UnitOfWork } from '../../db';
import { builtinRoleSeedRows } from '../roles';
import { ownerPermissionMap } from '../roles';
import { generateUniqueHouseholdCode, normalizeHouseholdCode } from './households.rules';
import type {
  CreateHouseholdInput,
  HouseholdRecord,
  UpdateHouseholdInput,
} from './households.schema';
import { householdRowSchema } from './households.schema';

/**
 * Household = root entity (CN §3). Offline creation (D49) seeds the 11
 * builtin roles; `code` is claimed here so a later /import of the device's
 * TXT snapshot lands in THIS household row (D62 conversion path).
 */
export class HouseholdsService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly random: RandomSource,
    private readonly blocklist: BlocklistChecker,
  ) {}

  async createOffline(input: CreateHouseholdInput): Promise<HouseholdRecord> {
    return this.uow.transact(async (tx) => {
      const code = await generateUniqueHouseholdCode(
        this.random,
        async (candidate) =>
          (await tx.query.households!.findFirst({
            where: eq(households.code, candidate),
            columns: { id: true },
          })) !== undefined,
        this.blocklist,
      );
      const [row] = await tx.insert(households).values({
        name: input.name,
        code,
        currency: input.currency,
        timezone: input.timezone,
      }).returning();
      const created = householdRowSchema.parse(row);

      await tx.insert(roles).values(builtinRoleSeedRows(created.id));
      await tx.insert(activityEvents).values({
        householdId: created.id,
        actorPersonId: null,
        ...buildActivity('household.created', { name: created.name }),
      });
      return created;
    });
  }

  /** Case-insensitive lookup for login + registration claiming. */
  async findByCode(rawCode: string): Promise<HouseholdRecord | null> {
    if (!isPlausible(rawCode)) return null;
    const row = await this.uow.exec.query.households!.findFirst({
      where: eq(households.code, normalizeHouseholdCode(rawCode)),
    });
    return row ? householdRowSchema.parse(row) : null;
  }

  /**
   * D62/D72 claim: register an offline device's code server-side so its
   * later /import adoption lands in THIS row. Blocklist still applies (D52);
   * a blocked code is indistinguishable from not-found (no enumeration).
   *
   * Seeds the 11 builtin presets PLUS one claim-scaffold owner-role
   * (sentinel `__claim__` builtinKey) so the pre-import session has a
   * working permission map AND a fully usable household. Adoption deletes
   * ALL claim-time roles and imports the device's real set (§4.11).
   */
  async claimByCode(input: CreateHouseholdInput & { code: string }): Promise<HouseholdRecord & { claimRoleId: string }> {
    const code = normalizeHouseholdCode(input.code);
    if (!isPlausible(code) || (await this.blocklist.isBlocked(code.toLowerCase()))) {
      throw new AppError('VALIDATION_ERROR', 'Household code is not valid');
    }
    return this.uow.transact(async (tx) => {
      const [row] = await tx.insert(households).values({
        name: input.name,
        code,
        currency: input.currency,
        timezone: input.timezone,
      }).returning();
      const created = householdRowSchema.parse(row);
      await tx.insert(roles).values(builtinRoleSeedRows(created.id));
      const [role] = await tx.insert(roles).values({
        householdId: created.id,
        builtinKey: CLAIM_ROLE_SENTINEL,
        name: 'Owner',
        isBuiltin: false,
        isOwnerRole: true,
        permissions: ownerPermissionMap(),
        defaultPermissions: ownerPermissionMap(),
      }).returning();
      return { ...created, claimRoleId: String(role!.id) };
    });
  }

  async get(householdId: string): Promise<HouseholdRecord> {
    const row = await this.uow.exec.query.households!.findFirst({
      where: eq(households.id, householdId),
    });
    if (!row) throw new AppError('NOT_FOUND', 'Household not found');
    return householdRowSchema.parse(row);
  }

  /** Worker fan-out anchor — ids only, details load per household. */
  async listIds(): Promise<string[]> {
    const rows = await this.uow.exec.query.households!.findMany({ columns: { id: true } });
    return rows.map((row) => String((row as Record<string, unknown>).id));
  }

  async update(
    actorPersonId: string | null,
    householdId: string,
    input: UpdateHouseholdInput,
  ): Promise<HouseholdRecord> {
    const existing = await this.get(householdId);
    const [updated] = await this.uow.exec.update(households).set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    }).where(eq(households.id, householdId)).returning();
    await this.uow.exec.insert(activityEvents).values({
      householdId,
      actorPersonId,
      ...buildActivity('household.updated', { name: updated?.name ?? existing.name }),
    });
    return householdRowSchema.parse(updated);
  }

  /** Sync/export bookkeeping — no activity events (not story-worthy). */
  async markSynced(householdId: string, at: Date): Promise<void> {
    await this.uow.exec.update(households).set({ syncedAt: at }).where(eq(households.id, householdId));
  }

  async markExported(householdId: string, at: Date): Promise<void> {
    await this.uow.exec.update(households).set({ lastExportAt: at }).where(eq(households.id, householdId));
  }
}

function isPlausible(code: string): boolean {
  return /^[A-Z]{6}$/.test(normalizeHouseholdCode(code));
}

/** Marks roles seeded by a registration claim — adoption deletes these. */
export const CLAIM_ROLE_SENTINEL = '__claim__';
