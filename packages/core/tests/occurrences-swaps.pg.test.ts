import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  occurrenceSwaps,
  occurrences,
  people as peopleTable,
  roles as rolesTable,
} from '@chorify/db';
import { OccurrencesService } from '../src/modules/occurrences/occurrences.service';
import { pgHarness, type PgHarness } from './pg-harness';

/**
 * PG-backed occurrence swaps (§16b / D113): create → accept applies the
 * reassign exactly once; decline/cancel are terminal no-ops; resolved rows
 * are immutable (ALREADY_DONE); only a current assignee may offer; only the
 * target may respond; targets must be household members. Skips cleanly
 * without Postgres.
 */

let h: PgHarness;

beforeAll(async () => {
  const harness = await pgHarness;
  if (!harness) return;
  h = harness;
});

afterAll(async () => {
  if (h) await h.pool.end();
});

const suite = describe.skipIf(!(await pgHarness));

/** Swaps trade turns between two members — insert a trading partner. */
async function seedSecondMember(
  harness: PgHarness,
  householdId: string,
  name: string,
): Promise<string> {
  const [role] = await harness.db
    .insert(rolesTable)
    .values({ householdId, name: `Member ${name}`, permissions: {}, defaultPermissions: {}, isBuiltin: false })
    .returning();
  const [person] = await harness.db
    .insert(peopleTable)
    .values({ householdId, roleId: role!.id, name })
    .returning();
  return person!.id;
}

suite('pg-backed occurrence swaps (D113 live)', () => {
  it('create → accept applies the reassign once and terminates the swap', async () => {
    const seed = await h.seedHousehold();
    const otherId = await seedSecondMember(h, seed.householdId, 'Abebe');
    const svc = new OccurrencesService(h.uow, h.clock);
    await svc.materializeHousehold(seed.householdId);

    const rows = await h.db
      .select()
      .from(occurrences)
      .where(eq(occurrences.ruleId, seed.ruleId));
    const target = rows.find((r) => r.dueDate === '2026-09-08');
    expect(target).toBeDefined();

    const swap = await svc.createSwap(seed.ownerId, seed.householdId, target!.id, {
      toPersonId: otherId,
    });
    expect(swap.status).toBe('pending');

    const resolved = await svc.resolveSwap(otherId, seed.householdId, swap.id, {
      action: 'accept',
    });
    expect(resolved.status).toBe('accepted');

    const after = await h.db.select().from(occurrences).where(eq(occurrences.id, target!.id));
    expect(after[0]?.personIds).toEqual([otherId]);

    await expect(
      svc.resolveSwap(otherId, seed.householdId, swap.id, { action: 'accept' }),
    ).rejects.toMatchObject({ code: 'ALREADY_DONE' });
  });

  it('decline and cancel are terminal no-ops; non-participants are FORBIDDEN', async () => {
    const seed = await h.seedHousehold();
    const otherId = await seedSecondMember(h, seed.householdId, 'Sami');
    const thirdId = await seedSecondMember(h, seed.householdId, 'Sara');
    const svc = new OccurrencesService(h.uow, h.clock);
    await svc.materializeHousehold(seed.householdId);
    const rows = await h.db.select().from(occurrences).where(eq(occurrences.ruleId, seed.ruleId));
    const target = rows[0]!;

    const swap = await svc.createSwap(seed.ownerId, seed.householdId, target.id, {
      toPersonId: otherId,
    });

    // A bystander cannot respond to someone else's swap.
    await expect(
      svc.resolveSwap(thirdId, seed.householdId, swap.id, { action: 'decline' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const declined = await svc.resolveSwap(otherId, seed.householdId, swap.id, { action: 'decline' });
    expect(declined.status).toBe('declined');
    const rowAfter = await h.db.select().from(occurrences).where(eq(occurrences.id, target.id));
    expect(rowAfter[0]?.personIds).toEqual(target.personIds);

    const swap2 = await svc.createSwap(seed.ownerId, seed.householdId, target.id, {
      toPersonId: otherId,
    });
    const cancelled = await svc.resolveSwap(seed.ownerId, seed.householdId, swap2.id, {
      action: 'cancel',
    });
    expect(cancelled.status).toBe('cancelled');

    await expect(
      svc.createSwap(seed.ownerId, seed.householdId, target.id, { toPersonId: seed.ownerId }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('lists incoming and outgoing pending swaps only', async () => {
    const seed = await h.seedHousehold();
    const otherId = await seedSecondMember(h, seed.householdId, 'Daniel');
    const svc = new OccurrencesService(h.uow, h.clock);
    await svc.materializeHousehold(seed.householdId);
    const rows = await h.db.select().from(occurrences).where(eq(occurrences.ruleId, seed.ruleId));

    await svc.createSwap(seed.ownerId, seed.householdId, rows[0]!.id, { toPersonId: otherId });
    await svc.createSwap(seed.ownerId, seed.householdId, rows[1]!.id, { toPersonId: otherId });

    const incoming = await svc.listIncomingSwaps(seed.householdId, otherId);
    const outgoing = await svc.listOutgoingSwaps(seed.householdId, seed.ownerId);
    expect(incoming).toHaveLength(2);
    expect(outgoing).toHaveLength(2);
    expect(incoming.every((s) => s.status === 'pending')).toBe(true);

    const none = await svc.listIncomingSwaps(seed.householdId, seed.ownerId);
    expect(none).toHaveLength(0);

    const allRows = await h.db
      .select()
      .from(occurrenceSwaps)
      .where(eq(occurrenceSwaps.householdId, seed.householdId));
    expect(allRows).toHaveLength(2);
    expect(allRows.every((s) => s.status === 'pending')).toBe(true);
  });

  it('rejects cross-household targets, non-assignees and terminal occurrences', async () => {
    const seed = await h.seedHousehold();
    const otherId = await seedSecondMember(h, seed.householdId, 'Marta');
    const svc = new OccurrencesService(h.uow, h.clock);
    await svc.materializeHousehold(seed.householdId);
    const rows = await h.db.select().from(occurrences).where(eq(occurrences.ruleId, seed.ruleId));
    const target = rows[0]!;

    // A person from a DIFFERENT household is not a valid target.
    const otherSeed = await h.seedHousehold();
    await expect(
      svc.createSwap(seed.ownerId, seed.householdId, target.id, { toPersonId: otherSeed.ownerId }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    // A non-assignee cannot offer a turn that is not theirs.
    await expect(
      svc.createSwap(otherId, seed.householdId, target.id, { toPersonId: seed.ownerId }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    // Terminal occurrences cannot be swapped (§6 immutability).
    await svc.act(seed.ownerId, seed.householdId, target.id, { action: 'complete' });
    await expect(
      svc.createSwap(seed.ownerId, seed.householdId, target.id, { toPersonId: otherId }),
    ).rejects.toMatchObject({ code: 'ALREADY_DONE' });
  });
});
