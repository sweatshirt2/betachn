import { and, eq } from 'drizzle-orm';
import { activityEvents, oauthAccounts, people, roles, sessions, users } from '@chorify/db';
import { buildActivity } from '../../activity';
import { AppError } from '../../errors';
import type { Executor, UnitOfWork } from '../../db';
import { accountCreationBlockers, promotionBlockers } from '../auth';
import { lastOwnerBlockers } from '../roles';
import type { CreatePersonInput, PersonRecord, UpdatePersonInput } from './people.schema';
import { z } from 'zod';
import { personRowSchema } from './people.schema';

interface RoleFlagRow {
  id: string;
  role: { isOwnerRole: boolean } | null;
}

const ownerFlagRow = z.object({ isOwnerRole: z.boolean() });
const contactAccountRow = z.object({ id: z.string().uuid(), phone: z.string().nullable() });
/**
 * People = household identities (CN §4). Accounts live in the users table and
 * are cascaded here on deletion (§6.22). R2 ownership gates:
 * - create targeting an owner role requires a phone in the SAME request
 *   (stored as people.phone contact);
 * - re-assigning an existing person to an owner role requires a recovery
 *   capable contact — users.phone or a linked Google identity (D54/D56).
 */
export class PeopleService {
  constructor(private readonly uow: UnitOfWork) {}

  async list(householdId: string): Promise<PersonRecord[]> {
    const rows = await this.uow.exec.query.people!.findMany({
      where: eq(people.householdId, householdId),
      orderBy: [people.createdAt],
    });
    return rows.map((row) => personRowSchema.parse(row));
  }

  async get(householdId: string, personId: string): Promise<PersonRecord> {
    const exec = this.uow.exec;
    const row = await this.findRow(exec, householdId, personId);
    return personRowSchema.parse(row);
  }

  async create(
    actorPersonId: string | null,
    householdId: string,
    input: CreatePersonInput,
  ): Promise<PersonRecord> {
    let targetHoldsOwnerRole = false;
    if (input.roleId) {
      const role = await this.uow.exec.query.roles!.findFirst({
        where: and(eq(roles.id, input.roleId), eq(roles.householdId, householdId)),
      });
      if (!role) throw new AppError('NOT_FOUND', 'Role not found');
      targetHoldsOwnerRole = ownerFlagRow.parse(role).isOwnerRole;
    }
    const blockers = accountCreationBlockers({ targetHoldsOwnerRole }, {
      hasPhone: Boolean(input.phone),
      hasVerifiedEmail: false,
    });
    if (blockers.length > 0) {
      throw new AppError('CONFLICT', 'Owners need a phone number for recovery', { blockers });
    }

    return this.uow.transact(async (tx) => {
      const [row] = await tx.insert(people).values({
        householdId,
        name: input.name,
        sex: input.sex ?? null,
        birthDate: input.birthDate ?? null,
        age: input.age ?? null,
        avatarEmoji: input.avatarEmoji ?? '🙂',
        roleId: input.roleId ?? null,
        phone: input.phone ?? null,
        permissionOverrides: {},
      }).returning();
      await tx.insert(activityEvents).values({
        householdId, actorPersonId, ...buildActivity('person.added', { personName: input.name }),
      });
      return personRowSchema.parse(row);
    });
  }

  async update(
    actorPersonId: string | null,
    householdId: string,
    personId: string,
    input: UpdatePersonInput,
  ): Promise<PersonRecord> {
    return this.uow.transact(async (tx) => {
      const row = await this.findRow(tx, householdId, personId);

      if (input.roleId !== undefined && input.roleId !== row.roleId) {
        const nextRole = input.roleId
          ? await tx.query.roles!.findFirst({
              where: and(eq(roles.id, input.roleId), eq(roles.householdId, householdId)),
            })
          : null;
        if (input.roleId && !nextRole) throw new AppError('NOT_FOUND', 'Role not found');

        const wasOwner = await this.isOwnerHolder(tx, row.id);
        const willBeOwner = nextRole?.isOwnerRole === true;

        if (!wasOwner && willBeOwner) {
          const blockers = promotionBlockers(await this.contactPresence(tx, row.id));
          if (blockers.length > 0) {
            throw new AppError('CONFLICT', 'Add a phone number or Google link before granting ownership', {
              blockers,
            });
          }
        }
        if (wasOwner && !willBeOwner) {
          const remaining = await this.ownerHolderCount(tx, householdId, { excluding: row.id });
          if (lastOwnerBlockers(remaining).length > 0) {
            throw new AppError('LAST_OWNER', 'The household needs at least one owner');
          }
        }
      }

      const [updated] = await tx.update(people).set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sex !== undefined ? { sex: input.sex } : {}),
        ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
        ...(input.age !== undefined ? { age: input.age } : {}),
        ...(input.avatarEmoji !== undefined ? { avatarEmoji: input.avatarEmoji } : {}),
        ...(input.roleId !== undefined ? { roleId: input.roleId } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
        ...(input.permissionOverrides !== undefined
          ? { permissionOverrides: input.permissionOverrides }
          : {}),
      }).where(eq(people.id, personId)).returning();

      await tx.insert(activityEvents).values({
        householdId, actorPersonId, ...buildActivity('person.updated', {
          personName: updated?.name ?? row.name,
        }),
      });
      return personRowSchema.parse(updated);
    });
  }

  /** Cascades user + session rows; history keeps actor ids (§6.22). */
  async remove(actorPersonId: string | null, householdId: string, personId: string): Promise<void> {
    await this.uow.transact(async (tx) => {
      const row = await this.findRow(tx, householdId, personId);

      if (await this.isOwnerHolder(tx, row.id)) {
        const remaining = await this.ownerHolderCount(tx, householdId, { excluding: row.id });
        if (lastOwnerBlockers(remaining).length > 0) {
          throw new AppError('LAST_OWNER', 'Assign another owner before removing this person');
        }
      }

      const found = await tx.query.users!.findFirst({
        where: eq(users.personId, row.id),
        columns: { id: true, phone: true },
      });
      const account = found ? contactAccountRow.parse(found) : null;
      if (account) {
        await tx.delete(sessions).where(eq(sessions.userId, account.id));
        await tx.delete(oauthAccounts).where(eq(oauthAccounts.userId, account.id));
        await tx.delete(users).where(eq(users.id, account.id));
      }
      await tx.delete(people).where(eq(people.id, row.id));

      await tx.insert(activityEvents).values({
        householdId, actorPersonId, ...buildActivity('person.removed', { personName: row.name }),
      });
    });
  }

  private async findRow(exec: Executor, householdId: string, personId: string) {
    const row = await exec.query.people!.findFirst({
      where: and(eq(people.id, personId), eq(people.householdId, householdId)),
    });
    if (!row) throw new AppError('NOT_FOUND', 'Person not found');
    return personRowSchema.parse(row);
  }

  private async isOwnerHolder(exec: Executor, personId: string): Promise<boolean> {
    const rows = await exec.query.people!.findMany({
      where: eq(people.id, personId),
      columns: { id: true },
      with: { role: { columns: { isOwnerRole: true } } },
    }) as unknown as RoleFlagRow[];
    return rows.some((r) => r.role?.isOwnerRole === true);
  }

  private async ownerHolderCount(
    exec: Executor,
    householdId: string,
    opts: { excluding?: string },
  ): Promise<number> {
    const rows = await exec.query.people!.findMany({
      where: eq(people.householdId, householdId),
      columns: { id: true },
      with: { role: { columns: { isOwnerRole: true } } },
    }) as unknown as RoleFlagRow[];
    return rows.filter((r) => r.role?.isOwnerRole === true && r.id !== opts.excluding).length;
  }

  /**
   * Recovery-capable contact for promotion gates: credential-scope phone on
   * the user row, or any linked OAuth identity (Google emails are verified
   * by definition — D50). people.phone alone does NOT qualify.
   */
  private async contactPresence(
    exec: Executor,
    personId: string,
  ): Promise<{ hasPhone: boolean; hasVerifiedEmail: boolean }> {
    const account = await exec.query.users!.findFirst({
      where: eq(users.personId, personId),
      columns: { id: true, phone: true },
    });
    if (!account) return { hasPhone: false, hasVerifiedEmail: false };
    const parsed = contactAccountRow.parse(account);
    const oauth = await exec.query.oauthAccounts!.findFirst({
      where: eq(oauthAccounts.userId, parsed.id),
      columns: { id: true },
    });
    return { hasPhone: Boolean(parsed.phone), hasVerifiedEmail: Boolean(oauth) };
  }
}

/** Owner-permission-role holders for a household — notification recipients, LAST_OWNER counts. */
export async function ownerHolderPersonIds(exec: Executor, householdId: string): Promise<string[]> {
  const rows = await exec.query.people!.findMany({
    where: eq(people.householdId, householdId),
    columns: { id: true },
    with: { role: { columns: { isOwnerRole: true } } },
  }) as unknown as RoleFlagRow[];
  return rows.filter((r) => r.role?.isOwnerRole === true).map((r) => r.id);
}
