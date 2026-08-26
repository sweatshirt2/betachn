import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { applyDeviceMigrations, isUpToDate } from './apply-migrations';
import { openNodeDevice, type NodeDevice } from './client';
import {
  assignmentRules,
  households,
  occurrences,
  people,
  pendingOps,
  responsibilities,
  roles,
} from './schema';

const devices: NodeDevice[] = [];
afterAll(() => {
  for (const device of devices) device.sqlite.close();
});

async function freshDevice(): Promise<NodeDevice> {
  const device = await openNodeDevice(':memory:');
  devices.push(device);
  expect(applyDeviceMigrations(device.migrations)).toBeGreaterThan(0);
  expect(isUpToDate(device.migrations)).toBe(true);
  return device;
}

describe('device migration track + mirror schema', () => {
  it('creates all mirrored tables and enforces the occurrence uniqueness law', async () => {
    const { db } = await freshDevice();

    const [household] = await db
      .insert(households)
      .values({ id: 'h1', name: 'Bekele Family', code: 'BEKELE' })
      .returning();
    const [role] = await db
      .insert(roles)
      .values({
        id: 'r1',
        householdId: household!.id,
        name: 'Mother',
        isBuiltin: true,
        isOwnerRole: true,
        permissions: {},
        defaultPermissions: {},
      })
      .returning();
    await db.insert(people).values({ id: 'p1', householdId: 'h1', name: 'Hana', roleId: role!.id });

    const [resp] = await db
      .insert(responsibilities)
      .values({ id: 'res1', householdId: 'h1', title: 'Laundry' })
      .returning();
    const [rule] = await db
      .insert(assignmentRules)
      .values({
        id: 'rule1',
        responsibilityId: resp!.id,
        pattern: 'weekly',
        daysOfWeek: [1],
        startDate: '2026-08-24',
        personIds: ['p1'],
      })
      .returning();

    await db.insert(occurrences).values({
      id: 'o1',
      householdId: 'h1',
      responsibilityId: resp!.id,
      ruleId: rule!.id,
      dueDate: '2026-08-31',
      personIds: ['p1'],
    });
    // §6.16 cornerstone: duplicate (ruleId, dueDate) must collide.
    await expect(
      db.insert(occurrences).values({
        id: 'o2',
        householdId: 'h1',
        responsibilityId: resp!.id,
        ruleId: rule!.id,
        dueDate: '2026-08-31',
        personIds: [],
      }),
    ).rejects.toThrowError();
  });

  it('relational reads resolve role on person', async () => {
    const { db } = await freshDevice();
    await db.insert(households).values({ id: 'h1', name: 'X', code: 'AAAAAA' });
    await db
      .insert(roles)
      .values({
        id: 'r1',
        householdId: 'h1',
        name: 'Father',
        isBuiltin: true,
        isOwnerRole: false,
        permissions: {},
        defaultPermissions: {},
      });
    await db.insert(people).values({ id: 'p1', householdId: 'h1', name: 'Abebe', roleId: 'r1' });

    const rows = await db.query.people.findMany({ with: { role: true } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role?.name).toBe('Father');
  });
});

describe('pending_ops queue', () => {
  it('queues FIFO, counts unsynced, and clears by uuid batch', async () => {
    const { db } = await freshDevice();
    const op = {
      uuid: 'u1',
      householdId: 'h1',
      entity: 'occurrence',
      entityId: 'o1',
      op: 'update' as const,
      payload: { status: 'completed' },
      audienceType: 'members' as const,
      audienceIds: ['p1'],
      domain: 'responsibilities',
      createdAt: new Date().toISOString(),
    };
    await db.insert(pendingOps).values([op, { ...op, uuid: 'u2' }, { ...op, uuid: 'u3' }]);

    const queued = await db.select().from(pendingOps);
    expect(queued.map((q) => q.uuid)).toEqual(['u1', 'u2', 'u3']);

    await db.delete(pendingOps).where(eq(pendingOps.uuid, 'u2'));
    const remaining = await db.select().from(pendingOps);
    expect(remaining.map((q) => q.uuid)).toEqual(['u1', 'u3']);
  });
});
