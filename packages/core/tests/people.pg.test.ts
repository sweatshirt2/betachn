import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activityEvents, oauthAccounts, people, roles, sessions, users } from '@chorify/db';
import { AppError } from '../src/errors';
import { PeopleService } from '../src/modules/people/people.service';
import { pgHarness, type PgHarness } from './pg-harness';

/**
 * PG-backed people lifecycle (§4.6/R2/D54/D56 + §6.20/§6.22). Runs the REAL
 * pgUnitOfWork against the REAL migration track — the RQB `with: {role:…}`
 * owner-flag reads and the cascade deletes are exactly the shapes fake-based
 * tests masked before. Skips cleanly when Postgres is unreachable.
 */

let h: PgHarness;
let svc: PeopleService;

beforeAll(async () => {
  const harness = await pgHarness;
  if (!harness) return;
  h = harness;
  svc = new PeopleService(h.uow);
});

afterAll(async () => {
  if (h) await h.pool.end();
});

const suite = describe.skipIf(!(await pgHarness));

async function ownerRoleId(householdId: string): Promise<string> {
  const [role] = await h.db
    .select()
    .from(roles)
    .where(and(eq(roles.householdId, householdId), eq(roles.isOwnerRole, true)));
  if (!role) throw new Error('harness seed lost its owner role');
  return role.id;
}

/** Attach a credentialed account to a person (the recovery-contact carrier). */
async function giveAccount(personId: string, householdId: string, username: string, phone: string) {
  const [user] = await h.db
    .insert(users)
    .values({ username, phone, personId, householdId })
    .returning();
  return user!;
}

suite('pg-backed people lifecycle (R2 / LAST_OWNER / cascade)', () => {
  it('create targeting an owner role demands a phone; promotion demands a recovery contact (R2/D54)', async () => {
    const seed = await h.seedHousehold();
    const roleId = await ownerRoleId(seed.householdId);

    // Owner-targeted creation without phone → blocked before any write.
    await expect(
      svc.create(null, seed.householdId, { name: 'No Contact', roleId }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(
      (await h.db.select().from(people).where(eq(people.householdId, seed.householdId))).length,
    ).toBe(1); // only the seed owner exists

    // Owner-targeted creation WITH a phone lands (people.phone = contact info, D55).
    const owner2 = await svc.create(null, seed.householdId, {
      name: 'Sara',
      roleId,
      phone: '+251911000001',
    });
    expect(owner2.roleId).toBe(roleId);

    // Promotion of a contactless person → blocked (no user phone, no Google link).
    const contactless = await svc.create(null, seed.householdId, { name: 'Bo' });
    await expect(
      svc.update(null, seed.householdId, contactless.id, { roleId }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    // Promotion succeeds once a recovery-capable contact exists (user.phone).
    await giveAccount(contactless.id, seed.householdId, 'bo', '+251911000002');
    const promoted = await svc.update(null, seed.householdId, contactless.id, { roleId });
    expect(promoted.roleId).toBe(roleId);
  });

  it('LAST_OWNER blocks demotion/removal that would strand the household (§6.20)', async () => {
    const seed = await h.seedHousehold();
    const roleId = await ownerRoleId(seed.householdId);

    // Sole owner demotion → LAST_OWNER.
    await expect(
      svc.update(null, seed.householdId, seed.ownerId, { roleId: null }),
    ).rejects.toMatchObject({ code: 'LAST_OWNER' });

    // Sole owner removal → LAST_OWNER.
    await expect(svc.remove(null, seed.householdId, seed.ownerId)).rejects.toMatchObject({
      code: 'LAST_OWNER',
    });

    // Second owner arrives (with the R2-required phone) → demote + remove open up.
    const owner2 = await svc.create(null, seed.householdId, {
      name: 'Sara',
      roleId,
      phone: '+251911000003',
    });
    await svc.update(null, seed.householdId, seed.ownerId, { roleId: null });
    const nowOwners = await h.db
      .select()
      .from(people)
      .where(and(eq(people.householdId, seed.householdId), eq(people.id, owner2.id)));
    expect(nowOwners).toHaveLength(1);
  });

  it('removal cascades user + sessions + oauth and records person.removed (§6.22); cross-household reads 404', async () => {
    const seed = await h.seedHousehold();

    const doomed = await svc.create(null, seed.householdId, { name: 'Daniel' });
    const user = await giveAccount(doomed.id, seed.householdId, 'daniel', '+251911000004');
    const [session] = await h.db
      .insert(sessions)
      .values({ userId: user.id, activePersonId: doomed.id, tokenHash: 'deadbeef', expiresAt: new Date() })
      .returning();
    const [oauth] = await h.db
      .insert(oauthAccounts)
      .values({ userId: user.id, providerAccountId: 'google-sub-42' })
      .returning();

    await svc.remove(null, seed.householdId, doomed.id);

    expect(await h.db.select().from(people).where(eq(people.id, doomed.id))).toHaveLength(0);
    expect(await h.db.select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
    expect(await h.db.select().from(sessions).where(eq(sessions.id, session!.id))).toHaveLength(0);
    expect(await h.db.select().from(oauthAccounts).where(eq(oauthAccounts.id, oauth!.id))).toHaveLength(0);

    const [event] = await h.db
      .select()
      .from(activityEvents)
      .where(and(eq(activityEvents.householdId, seed.householdId), eq(activityEvents.type, 'person.removed')));
    expect(event).toBeDefined();

    // Cross-household id → 404, never a leak of existence (§8).
    const otherHousehold = await h.seedHousehold();
    await expect(svc.get(otherHousehold.householdId, doomed.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
  });
});
