import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { householdChanges, people, roles, shoppingItems, supplies } from '@chorify/db';
import { SyncService, type PushOp, type ViewerIdentity } from '../src/modules/sync';
import { pgHarness, type PgHarness } from './pg-harness';

/**
 * PG-backed sync feed (§4.12, D59–D61, D71, D91, D92). Real pgUnitOfWork:
 * proves uuid idempotency on the unique partial index, D91 write-through to
 * the authoritative tables, per-op domain re-auth, D61 live audience
 * evaluation + CN XIX-4 domain filtering at pull, and the D92 bootstrap
 * snapshot. Skips cleanly when Postgres is unreachable.
 */

let h: PgHarness;
let svc: SyncService;

beforeAll(async () => {
  const harness = await pgHarness;
  if (!harness) return;
  h = harness;
  svc = new SyncService(h.uow);
});

afterAll(async () => {
  if (h) await h.pool.end();
});

const suite = describe.skipIf(!(await pgHarness));

function ownerViewer(personId: string): ViewerIdentity & { householdId: string } {
  return { personId, householdId: '', roleIds: [], resolves: () => true };
}

/** No permissions at all — pushes must be rejected, pulls must stay empty. */
function restrictedViewer(personId: string): ViewerIdentity & { householdId: string } {
  return { personId, householdId: '', roleIds: [], resolves: () => false };
}

/** Plain (non-owner) member for audience scoping checks. */
async function plainMember(householdId: string): Promise<string> {
  const [role] = await h.db
    .insert(roles)
    .values({ householdId, name: 'Member', isBuiltin: false, permissions: {}, defaultPermissions: {} })
    .returning();
  const [person] = await h.db
    .insert(people)
    .values({ householdId, name: 'Member', roleId: role!.id, permissionOverrides: {} })
    .returning();
  return person!.id;
}

function supplyCreateOp(householdId: string, uuid: string, audienceType: 'all' | 'members', audienceIds: string[]): PushOp {
  return {
    uuid,
    entity: 'supplies',
    entityId: crypto.randomUUID(),
    op: 'create',
    payload: { householdId, name: 'Detergent', state: 'low' },
    audienceType,
    audienceIds,
    domain: 'resources',
  };
}

suite('pg-backed sync feed (push/pull/bootstrap live)', () => {
  it('push applies D91 write-through, appends the feed row with actor + seq, and is D71-uuid-idempotent', async () => {
    const seed = await h.seedHousehold();
    const viewer = { ...ownerViewer(seed.ownerId), householdId: seed.householdId };
    const op = supplyCreateOp(seed.householdId, crypto.randomUUID(), 'all', []);

    const [outcome] = await svc.push(viewer, [op]);
    expect(outcome).toMatchObject({ status: 'accepted', seq: 1 });

    // Write-through: the authoritative supplies table has the row.
    const rows = await h.db.select().from(supplies).where(eq(supplies.id, op.entityId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Detergent', state: 'low' });

    // Feed row: actor recorded, full after-state payload, uuid stored.
    const [feed] = await h.db.select().from(householdChanges).where(eq(householdChanges.clientOpUuid, op.uuid));
    expect(feed).toBeDefined();
    expect(feed).toMatchObject({
      householdId: seed.householdId,
      actorPersonId: seed.ownerId,
      entity: 'supplies',
      op: 'create',
      seq: 1,
    });

    // Replay with a MUTATED payload: duplicate is reported, nothing re-applies.
    const [replay] = await svc.push(viewer, [
      { ...op, payload: { ...op.payload, name: 'Tampered' } },
    ]);
    expect(replay).toEqual({ uuid: op.uuid, status: 'duplicate' });
    expect(
      (await h.db.select().from(supplies).where(eq(supplies.id, op.entityId)))[0]?.name,
    ).toBe('Detergent');
    expect(
      (await h.db.select().from(householdChanges).where(eq(householdChanges.householdId, seed.householdId))).length,
    ).toBe(1);
    expect(await svc.headSeq(seed.householdId)).toBe(1);
  });

  it('rejects ops the actor has no current domain permission for (sync is not a bypass)', async () => {
    const seed = await h.seedHousehold();
    const viewer = { ...restrictedViewer(seed.ownerId), householdId: seed.householdId };
    const op = supplyCreateOp(seed.householdId, crypto.randomUUID(), 'all', []);

    const [outcome] = await svc.push(viewer, [op]);
    expect(outcome).toEqual({ uuid: op.uuid, status: 'rejected', reason: 'FORBIDDEN_DOMAIN' });

    expect(await h.db.select().from(supplies).where(eq(supplies.id, op.entityId))).toHaveLength(0);
    expect(
      await h.db.select().from(householdChanges).where(eq(householdChanges.householdId, seed.householdId)),
    ).toHaveLength(0);
  });

  it('pull evaluates audiences LIVE (D61) and filters by permission domain (CN XIX-4)', async () => {
    const seed = await h.seedHousehold();
    const memberId = await plainMember(seed.householdId);
    const owner = { ...ownerViewer(seed.ownerId), householdId: seed.householdId };

    // Members-scoped resources change + all-scoped resources change.
    const scoped = supplyCreateOp(seed.householdId, crypto.randomUUID(), 'members', [seed.ownerId]);
    const open = supplyCreateOp(seed.householdId, crypto.randomUUID(), 'all', []);
    await svc.push(owner, [scoped, open]);

    // A second domain (home) for the permission-gate half.
    const roomOp: PushOp = {
      uuid: crypto.randomUUID(),
      entity: 'rooms',
      entityId: crypto.randomUUID(),
      op: 'create',
      payload: { householdId: seed.householdId, name: 'Kitchen' },
      audienceType: 'all',
      audienceIds: [],
      domain: 'home',
    };
    await svc.push(owner, [roomOp]);

    // Permissive viewer sees both resources changes…
    const ownerPull = await svc.pull(owner, 0);
    expect(ownerPull.changes.map((c) => c.uuid ?? c.entity)).toEqual(
      expect.arrayContaining([scoped.entity, open.entity, roomOp.entity]),
    );
    expect(ownerPull.cursor).toBe(3);
    expect(ownerPull.hasMore).toBe(false);

    // …the plain member only the all-scoped one (members list excludes them)…
    const member = { ...ownerViewer(memberId), householdId: seed.householdId };
    const memberPull = await svc.pull(member, 0);
    expect(memberPull.changes.map((c) => c.entityId)).not.toContain(scoped.entityId);
    expect(memberPull.changes.map((c) => c.entityId)).toContain(open.entityId);

    // …and a viewer without ANY domain permissions sees nothing, audience notwithstanding.
    const blind = { ...restrictedViewer(memberId), householdId: seed.householdId };
    expect((await svc.pull(blind, 0)).changes).toHaveLength(0);
  });

  it('delete ops tombstone the table row while the feed keeps both changes', async () => {
    const seed = await h.seedHousehold();
    const viewer = { ...ownerViewer(seed.ownerId), householdId: seed.householdId };
    const create = supplyCreateOp(seed.householdId, crypto.randomUUID(), 'all', []);
    await svc.push(viewer, [create]);

    const del: PushOp = {
      uuid: crypto.randomUUID(),
      entity: 'supplies',
      entityId: create.entityId,
      op: 'delete',
      payload: {},
      audienceType: 'all',
      audienceIds: [],
      domain: 'resources',
    };
    const [outcome] = await svc.push(viewer, [del]);
    expect(outcome).toMatchObject({ status: 'accepted' });

    expect(await h.db.select().from(supplies).where(eq(supplies.id, create.entityId))).toHaveLength(0);
    expect(await svc.headSeq(seed.householdId)).toBe(2);
  });

  it('bootstrap snapshot is domain-filtered and cursor-anchored (D92)', async () => {
    const seed = await h.seedHousehold();
    const viewer = { ...ownerViewer(seed.ownerId), householdId: seed.householdId };
    const op = supplyCreateOp(seed.householdId, crypto.randomUUID(), 'all', []);
    await svc.push(viewer, [op]);

    const snap = await svc.bootstrapSnapshot(viewer);
    expect(snap.cursor).toBe(1);
    expect(snap.sections.supplies).toHaveLength(1);
    expect(snap.sections.supplies?.[0]).toMatchObject({ id: op.entityId, name: 'Detergent' });

    // Zero-permission viewer gets no restricted-domain sections at all.
    const blind = { ...restrictedViewer(seed.ownerId), householdId: seed.householdId };
    const blindSnap = await svc.bootstrapSnapshot(blind);
    expect(blindSnap.sections.supplies).toBeUndefined();
  });

  it('shopping-item updates arrive with quantity text intact (device write-through shape)', async () => {
    const seed = await h.seedHousehold();
    const viewer = { ...ownerViewer(seed.ownerId), householdId: seed.householdId };
    const op: PushOp = {
      uuid: crypto.randomUUID(),
      entity: 'shopping_items',
      entityId: crypto.randomUUID(),
      op: 'create',
      payload: { householdId: seed.householdId, name: 'Rice', quantityText: '2 kg' },
      audienceType: 'all',
      audienceIds: [],
      domain: 'resources',
    };
    await svc.push(viewer, [op]);
    const [row] = await h.db.select().from(shoppingItems).where(eq(shoppingItems.id, op.entityId));
    expect(row).toMatchObject({ name: 'Rice', quantityText: '2 kg' });
  });
});
