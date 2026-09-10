import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { households, people, roles, users } from '@chorify/db';
import { AppError } from '../src/errors';
import { HouseholdsService } from '../src/modules/households/households.service';
import { PortabilityService } from '../src/modules/portability/portability.service';
import { ownerHolderPersonIds } from '../src/modules/people/people.service';
import { parseHouseholdExport, type ExportSection, type HouseholdExport, type Row } from '../src/txt';
import { pgHarness, type PgHarness } from './pg-harness';
import type { BlocklistChecker, RandomSource } from '../src/ports';

/**
 * PG-backed portability (§4.11 / CN §§62–69): export strips identity material
 * and roundtrips; import adoption blocks ANY rows beyond the registering trio
 * with ZERO writes (tx rollback); a fresh target adopts verbatim ids, repoints
 * the importer onto the imported owner seat and deletes the placeholder (D72).
 * The adoption payload is FK-consistent: household-scoped rows carry the
 * TARGET household's id (the pinned import contract). Skips w/o Postgres.
 */

let h: PgHarness;
let svc: PortabilityService;

const randomFake: RandomSource = {
  nextString: () => 'QWERTZ',
  nextInt: (max) => Math.floor(max / 2),
};
const blocklistFake: BlocklistChecker = { isBlocked: () => false };

beforeAll(async () => {
  const harness = await pgHarness;
  if (!harness) return;
  h = harness;
  svc = new PortabilityService(
    h.uow,
    h.clock,
    new HouseholdsService(h.uow, randomFake, blocklistFake),
  );
});

afterAll(async () => {
  if (h) await h.pool.end();
});

const suite = describe.skipIf(!(await pgHarness));

/** Remap an export's household-scoped ids onto the adoption target. */
function remapTo(text: string, targetHouseholdId: string): string {
  const { version, data } = parseHouseholdExport(text);
  const remapped = {} as HouseholdExport;
  for (const [section, rows] of Object.entries(data) as [ExportSection, Row[]][]) {
    remapped[section] = rows.map((row) => {
      const next = { ...row };
      if (section === 'households') next.id = targetHouseholdId;
      if ('householdId' in next) next.householdId = targetHouseholdId;
      return next;
    });
  }
  return `### CHORIFY-HOUSEHOLD v${version}\n${JSON.stringify(remapped, null, 2)}\n`;
}

async function attachAccount(personId: string, householdId: string, username: string, phone: string) {
  const [user] = await h.db
    .insert(users)
    .values({ username, phone, passwordHash: 'argon2-secret', personId, householdId })
    .returning();
  return user!;
}

/**
 * Simulate "the device's data was never on this server": remove a household's
 * rows child-first. Adoption inserts verbatim ids, so leaving the source rows
 * in place would trip the primary keys — impossible in the real D62 flow,
 * where the payload comes from a device DB.
 */
async function wipeHousehold(householdId: string) {
  const { assignmentRules, occurrences, responsibilities, subtasks, serviceRecords, assets, rooms, supplies, shoppingItems, activityEvents, notifications, notificationPrefs } = await import('@chorify/db');
  await h.db.delete(occurrences).where(eq(occurrences.householdId, householdId));
  const respIds = (await h.db.select({ id: responsibilities.id }).from(responsibilities).where(eq(responsibilities.householdId, householdId))).map((r) => r.id);
  if (respIds.length > 0) {
    await h.db.delete(subtasks).where(inArray(subtasks.responsibilityId, respIds));
    await h.db.delete(assignmentRules).where(inArray(assignmentRules.responsibilityId, respIds));
  }
  await h.db.delete(responsibilities).where(eq(responsibilities.householdId, householdId));
  const assetIds = (await h.db.select({ id: assets.id }).from(assets).where(eq(assets.householdId, householdId))).map((r) => r.id);
  if (assetIds.length > 0) {
    await h.db.delete(serviceRecords).where(inArray(serviceRecords.assetId, assetIds));
  }
  await h.db.delete(assets).where(eq(assets.householdId, householdId));
  await h.db.delete(rooms).where(eq(rooms.householdId, householdId));
  await h.db.delete(shoppingItems).where(eq(shoppingItems.householdId, householdId));
  await h.db.delete(supplies).where(eq(supplies.householdId, householdId));
  await h.db.delete(activityEvents).where(eq(activityEvents.householdId, householdId));
  await h.db.delete(notifications).where(eq(notifications.householdId, householdId));
  const personIds = (await h.db.select({ id: people.id }).from(people).where(eq(people.householdId, householdId))).map((p) => p.id);
  if (personIds.length > 0) {
    await h.db.delete(notificationPrefs).where(inArray(notificationPrefs.personId, personIds));
  }
  await h.db.delete(users).where(eq(users.householdId, householdId));
  await h.db.delete(people).where(eq(people.householdId, householdId));
  await h.db.delete(roles).where(eq(roles.householdId, householdId));
}

suite('pg-backed portability (export/import live)', () => {
  it('export strips phones + password hashes, roundtrips, stamps lastExportAt', async () => {
    const seed = await h.seedHousehold();
    await attachAccount(seed.ownerId, seed.householdId, 'hana', '+251911000010');
    await h.db.update(people).set({ phone: '+251911000011' }).where(eq(people.id, seed.ownerId));

    const { text, filename } = await svc.exportHousehold(seed.householdId);
    expect(filename).toBe('My-Household-2026-09-07.txt'); // harness clock

    const { data } = parseHouseholdExport(text);
    expect(data.households).toHaveLength(1);
    expect(data.people[0]).toMatchObject({ id: seed.ownerId, name: 'Hana' });
    expect(data.people[0]).not.toHaveProperty('phone');
    expect(data.users[0]).toMatchObject({ username: 'hana' });
    expect(data.users[0]).not.toHaveProperty('passwordHash');
    expect(data.users[0]).not.toHaveProperty('phone');
    expect(data.responsibilities[0]).toMatchObject({ id: seed.responsibilityId });
    expect(data.assignment_rules[0]).toMatchObject({ id: seed.ruleId });

    const [row] = await h.db.select().from(households).where(eq(households.id, seed.householdId));
    expect(row?.lastExportAt).not.toBeNull();
  });

  it('IMPORT_CONFLICT when rows exist beyond the trio — zero writes survive (tx rollback)', async () => {
    const source = await h.seedHousehold();
    const target = await h.seedHousehold();
    const user = await attachAccount(target.ownerId, target.householdId, 'owner2', '+251911000012');

    const before = {
      roles: (await h.db.select().from(roles).where(eq(roles.householdId, target.householdId))).length,
      people: (await h.db.select().from(people).where(eq(people.householdId, target.householdId))).length,
    };

    const { text } = await svc.exportHousehold(source.householdId);
    await expect(
      svc.importForAdoption(remapTo(text, target.householdId), {
        userId: user.id,
        householdId: target.householdId,
      }),
    ).rejects.toMatchObject({ code: 'IMPORT_CONFLICT', httpStatus: 409 });

    // The pre-scan claim teardown deleted roles inside the tx — rollback proves
    // the block leaves the target byte-identical (CN §67: nothing was changed).
    const after = {
      roles: (await h.db.select().from(roles).where(eq(roles.householdId, target.householdId))).length,
      people: (await h.db.select().from(people).where(eq(people.householdId, target.householdId))).length,
    };
    expect(after).toEqual(before);
    expect(after.roles).toBe(1); // the owner role survived
  });

  it('fresh adoption: verbatim ids, owner-seat repoint, placeholder deletion, syncedAt flip', async () => {
    const source = await h.seedHousehold();

    // Registering trio only (claim-scaffold shape): household + placeholder + user.
    const [target] = await h.db
      .insert(households)
      .values({ name: 'placeholder', code: 'ADPT01' })
      .returning();
    const [placeholder] = await h.db
      .insert(people)
      .values({ householdId: target!.id, name: 'placeholder', avatarEmoji: '👤' })
      .returning();
    const user = await attachAccount(placeholder!.id, target!.id, 'adopter', '+251911000013');

    const { text } = await svc.exportHousehold(source.householdId);
    await wipeHousehold(source.householdId); // device data was never server-side
    const result = await svc.importForAdoption(remapTo(text, target!.id), {
      userId: user.id,
      householdId: target!.id,
    });
    expect(result.importedOwnerPersonId).toBe(source.ownerId);

    // Imported rows keep their original ids (cross-references survive §4.11).
    expect(
      await h.db.select().from(people).where(eq(people.id, source.ownerId)),
    ).toHaveLength(1);
    expect(
      await h.db.select().from(people).where(eq(people.id, placeholder!.id)),
    ).toHaveLength(0); // placeholder deleted after the seat repoint
    expect(
      await h.db.select().from(users).where(eq(users.id, user.id)),
    ).toMatchObject([{ personId: source.ownerId }]);

    const owners = await ownerHolderPersonIds(h.db, target!.id);
    expect(owners).toEqual([source.ownerId]);

    const [adopted] = await h.db.select().from(households).where(eq(households.id, target!.id));
    expect(adopted?.name).toBe('Harness Family'); // profile adopted from the file
    expect(adopted?.code).toBe('ADPT01'); // code identical by claim, never rewritten
    expect(adopted?.syncedAt).not.toBeNull();
  });

  it('garbage payload → VALIDATION_ERROR before any write', async () => {
    const seed = await h.seedHousehold();
    const user = await attachAccount(seed.ownerId, seed.householdId, 'hana3', '+251911000014');
    await expect(
      svc.importForAdoption('not a household file', {
        userId: user.id,
        householdId: seed.householdId,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' } satisfies Partial<AppError>);
  });
});
