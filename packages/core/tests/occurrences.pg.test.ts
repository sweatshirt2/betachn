import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { occurrences } from '@chorify/db';
import { AppError } from '../src/errors';
import { OccurrencesService } from '../src/modules/occurrences/occurrences.service';
import { pgHarness, type PgHarness } from './pg-harness';

/**
 * PG-backed occurrence lifecycle (§16.3 hardening: fake-based unit tests
 * masked three real driver bugs — RQB key shapes, nested-read scoping,
 * orderBy shapes). This suite runs the REAL pgUnitOfWork against the REAL
 * migration track; it skips cleanly when Postgres is unreachable.
 *
 * Harness clock is fixed at 2026-09-07T09:00Z; household tz is
 * Africa/Addis_Ababa (+03:00) ⇒ local today = '2026-09-07'.
 */

let h: PgHarness;

beforeAll(async () => {
  const harness = await pgHarness;
  if (!harness) return; // suite skipped below
  h = harness;
});

afterAll(async () => {
  if (h) await h.pool.end();
});

const suite = describe.skipIf(!(await pgHarness));

suite('pg-backed occurrence lifecycle (§4.9 live)', () => {
  it('materializes a daily rule tz-aware into the real table', async () => {
    const seed = await h.seedHousehold();
    const svc = new OccurrencesService(h.uow, h.clock);
    const inserted = await svc.materializeHousehold(seed.householdId);
    expect(inserted).toBe(14); // §6.16 horizon [today, today+13]

    const rows = await h.db
      .select()
      .from(occurrences)
      .where(eq(occurrences.ruleId, seed.ruleId));
    expect(rows).toHaveLength(14);
    expect(rows.map((r) => r.dueDate)).toContain('2026-09-07');

    // Idempotent rerun — (ruleId, dueDate) unique + onConflictDoNothing (§6.16).
    expect(await svc.materializeHousehold(seed.householdId)).toBe(0);
  });

  it('listRange applies real SQL range predicates (from inclusive, to exclusive)', async () => {
    const seed = await h.seedHousehold();
    const svc = new OccurrencesService(h.uow, h.clock);
    await svc.materializeHousehold(seed.householdId);

    const mid = await svc.listRange(seed.householdId, { from: '2026-09-10', to: '2026-09-10' });
    expect(mid).toHaveLength(1);
    expect(mid[0]?.dueDate).toBe('2026-09-10');

    // personId filter rides the jsonb array — real containment semantics.
    const mine = await svc.listRange(seed.householdId, { personId: seed.ownerId });
    expect(mine.length).toBe(14);
    const ghost = await svc.listRange(seed.householdId, { personId: '00000000-0000-0000-0000-000000000000' });
    expect(ghost).toHaveLength(0);
  });

  it('listRangeTitled joins responsibility titles over the real FK', async () => {
    const seed = await h.seedHousehold();
    const svc = new OccurrencesService(h.uow, h.clock);
    await svc.materializeHousehold(seed.householdId);

    const titled = await svc.listRangeTitled(seed.householdId, { from: '2026-09-10', to: '2026-09-10' });
    expect(titled).toHaveLength(1);
    expect(titled[0]?.title).toBe('Trash');
    expect(titled[0]?.dueDate).toBe('2026-09-10');
    // every row carries a non-empty title — the Chores list wire contract
    expect(titled.every((o) => o.title.length > 0)).toBe(true);
  });

  it('act(complete) persists and second completion throws ALREADY_DONE (first-write-wins)', async () => {
    const seed = await h.seedHousehold();
    const svc = new OccurrencesService(h.uow, h.clock);
    await svc.materializeHousehold(seed.householdId);
    const target = (
      await svc.listRange(seed.householdId, { from: '2026-09-07', to: '2026-09-07' })
    )[0];
    expect(target).toBeDefined();

    const done = await svc.act(seed.ownerId, seed.householdId, target.id, {
      action: 'complete',
      note: 'out the door',
    });
    expect(done.status).toBe('completed');
    expect(done.completedByPersonId).toBe(seed.ownerId);
    expect(done.note).toBe('out the door');

    await expect(
      svc.act('00000000-0000-0000-0000-000000000001', seed.householdId, target.id, {
        action: 'complete',
      }),
    ).rejects.toMatchObject({ code: 'ALREADY_DONE', httpStatus: 409 });
  });

  it('sweepMissed flips only past-due pending rows, tz-aware, and is idempotent', async () => {
    const seed = await h.seedHousehold();
    const svc = new OccurrencesService(h.uow, h.clock);
    await svc.materializeHousehold(seed.householdId);

    // Local-today row stays; yesterday is stale under Africa/Addis_Ababa.
    const swept = await svc.sweepMissed(seed.householdId);
    expect(swept).toBe(0); // horizon starts at local today — nothing stale yet

    // Backdate one occurrence to 2026-09-06 (< local today 2026-09-07).
    await h.db
      .update(occurrences)
      .set({ dueDate: '2026-09-06' })
      .where(and(eq(occurrences.ruleId, seed.ruleId), eq(occurrences.dueDate, '2026-09-07')));

    expect(await svc.sweepMissed(seed.householdId)).toBe(1);
    const rows = await h.db
      .select()
      .from(occurrences)
      .where(and(eq(occurrences.ruleId, seed.ruleId), inArray(occurrences.status, ['missed'])));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.dueDate).toBe('2026-09-06');

    // Second sweep is a no-op (status flip, not a rewrite).
    expect(await svc.sweepMissed(seed.householdId)).toBe(0);
  });

  it('regenerateForward deletes pending ≥ tz-today and re-expands; terminal rows survive', async () => {
    const seed = await h.seedHousehold();
    const svc = new OccurrencesService(h.uow, h.clock);
    await svc.materializeHousehold(seed.householdId);

    // Complete the today row (terminal) and backdate another (below the cutoff).
    const todayRow = (
      await svc.listRange(seed.householdId, { from: '2026-09-07', to: '2026-09-07' })
    )[0];
    await svc.act(seed.ownerId, seed.householdId, todayRow.id, { action: 'complete' });
    await h.db
      .update(occurrences)
      .set({ dueDate: '2026-09-05' })
      .where(and(eq(occurrences.ruleId, seed.ruleId), eq(occurrences.dueDate, '2026-09-08')));

    await svc.regenerateForward(seed.responsibilityId);

    const rows = await h.db.select().from(occurrences).where(eq(occurrences.ruleId, seed.ruleId));
    const due = new Set(rows.map((r) => r.dueDate));
    expect(due.has('2026-09-05')).toBe(true); // stale row untouched (forward-only)
    expect(due.has('2026-09-07')).toBe(true); // terminal row survives
    // 14 pending = the below-cutoff 09-05 survivor (forward-only never touches
    // it) + regenerated 09-08..09-20 (the backdate vacated the 09-08 slot).
    const pending = rows.filter((r) => r.status === 'pending');
    expect(pending.length).toBe(14);
  });

  it('unknown occurrence → NOT_FOUND envelope (real FK-gated reads)', async () => {
    const seed = await h.seedHousehold();
    const svc = new OccurrencesService(h.uow, h.clock);
    await expect(
      svc.act(seed.ownerId, seed.householdId, '00000000-0000-0000-0000-000000000009', {
        action: 'complete',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', httpStatus: 404 });
  });
});
