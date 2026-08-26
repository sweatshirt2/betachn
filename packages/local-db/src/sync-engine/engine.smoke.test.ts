import { afterAll, describe, expect, it } from 'vitest';
import { applyDeviceMigrations } from '../apply-migrations';
import { openNodeDevice, type NodeDevice } from '../client';
import {
  assignmentRules,
  deviceSyncState,
  households,
  notifications,
  occurrences,
  pendingOps,
  people,
  responsibilities,
} from '../schema';
import { SyncEngine } from './engine';
import type { PullChangeWire, PushOutcomeWire, SyncOpWire, SyncTransport } from './transport';

const devices: NodeDevice[] = [];
afterAll(() => {
  for (const device of devices) device.sqlite.close();
});

interface Rig {
  device: NodeDevice;
  engine: SyncEngine;
  pushedBatches: SyncOpWire[][];
  setPull(changes: PullChangeWire[]): void;
}

async function rig(): Promise<Rig> {
  const device = await openNodeDevice(':memory:');
  devices.push(device);
  applyDeviceMigrations(device.migrations);
  await device.db.insert(households).values({ id: 'h1', name: 'Bekele', code: 'BEKELE' });
  await device.db.insert(people).values({ id: 'p-me', householdId: 'h1', name: 'Me' });
  await device.db.insert(people).values({ id: 'p-other', householdId: 'h1', name: 'Abebe' });

  const pushedBatches: SyncOpWire[][] = [];
  let pullQueue: PullChangeWire[] = [];

  const transport: SyncTransport = {
    async push(_code, ops) {
      pushedBatches.push(ops);
      return ops.map<PushOutcomeWire>((op) => ({ uuid: op.uuid, status: 'accepted' }));
    },
    async pull(_code, sinceSeq) {
      if (sinceSeq > 0 || pullQueue.length === 0) {
        return { changes: [], cursor: sinceSeq, hasMore: false };
      }
      const changes = pullQueue;
      pullQueue = [];
      return { changes, cursor: changes.at(-1)!.seq, hasMore: false };
    },
    async bootstrap() {
      return { cursor: 0, sections: {} };
    },
  };

  const engine = new SyncEngine(device.db, transport, {
    token: () => 'tok',
    householdCode: () => 'BEKELE',
    householdId: () => 'h1',
    myPersonId: () => 'p-me',
  });
  return {
    device,
    engine,
    pushedBatches,
    setPull: (changes) => {
      pullQueue = changes;
    },
  };
}

function mkOp(uuid: string, entityId = 'e1') {
  return {
    uuid,
    householdId: 'h1',
    entity: 'occurrences',
    entityId,
    op: 'update' as const,
    payload: { status: 'pending' },
    audienceType: 'all' as const,
    audienceIds: [],
    domain: 'responsibilities',
    createdAt: new Date().toISOString(),
  };
}

describe('sync engine', () => {
  it('pushes FIFO batches, ack-clears the queue, persists sync state', async () => {
    const { device, engine, pushedBatches } = await rig();

    await device.db.insert(pendingOps).values([mkOp('u1'), mkOp('u2')]);
    const result = await engine.flush();

    expect(result.pushed).toBe(2);
    expect(pushedBatches[0]!.map((op) => op.uuid)).toEqual(['u1', 'u2']);
    expect((await device.db.select().from(pendingOps)).length).toBe(0);

    const state = (await device.db.select().from(deviceSyncState))[0];
    expect(state?.lastSuccessfulSyncAt).toBeTruthy();
    expect(Number(state?.cursor ?? -1)).toBe(0);
  });

  it('applies pulled rows LWW; deletes are tombstones (resurrectable)', async () => {
    const { device, engine, setPull } = await rig();
    await device.db.insert(responsibilities).values({ id: 'res1', householdId: 'h1', title: 'Laundry' });
    await device.db.insert(assignmentRules).values({
      id: 'rule1', responsibilityId: 'res1', pattern: 'daily', startDate: '2026-09-01', personIds: [],
    });
    setPull([
      {
        seq: 1, actorPersonId: 'p-other', entity: 'occurrences', entityId: 'o1', op: 'create',
        payload: {
          householdId: 'h1', responsibilityId: 'res1', ruleId: 'rule1',
          dueDate: '2026-09-01', personIds: [], status: 'pending',
        },
      },
      {
        seq: 2, actorPersonId: 'p-other', entity: 'occurrences', entityId: 'o1', op: 'delete',
        payload: {},
      },
    ]);

    const result = await engine.flush();
    expect(result.applied).toBe(2);
    expect((await device.db.select().from(occurrences)).length).toBe(0);
  });

  it('coalesces loss notifications per entity; self-changes stay silent', async () => {
    const { device, engine, setPull } = await rig();
    // Own write still queued for o1 → another actor overwriting it is OUR loss.
    await device.db.insert(pendingOps).values(mkOp('u-lost', 'o1'));
    // Full after-state rows per §4.5 — partial payloads never travel.
    const fullRow = (over: Record<string, unknown>) => ({
      householdId: 'h1', responsibilityId: 'res1', ruleId: 'rule1',
      dueDate: '2026-09-01', personIds: [], status: 'completed' as const,
      subtaskStates: {}, ...over,
    });
    setPull([
      { seq: 1, actorPersonId: 'p-other', entity: 'occurrences', entityId: 'o1', op: 'update', payload: fullRow({}) },
      { seq: 2, actorPersonId: 'p-other', entity: 'occurrences', entityId: 'o1', op: 'update', payload: fullRow({ note: 'again' }) },
      { seq: 3, actorPersonId: 'p-me', entity: 'occurrences', entityId: 'o9', op: 'update', payload: fullRow({ id: 'o9' }) },
    ]);
    await device.db.insert(responsibilities).values({ id: 'res1', householdId: 'h1', title: 'Laundry' });
    await device.db.insert(assignmentRules).values({
      id: 'rule1', responsibilityId: 'res1', pattern: 'daily', startDate: '2026-09-01', personIds: [],
    });

    await engine.flush();

    const losses = await device.db.select().from(notifications);
    expect(losses).toHaveLength(1);
    expect(losses[0]?.type).toBe('sync.changeOverwritten');
    expect((losses[0]?.paramsJson as Record<string, unknown>).count).toBe(2);
    expect((losses[0]?.paramsJson as Record<string, unknown>).byName).toBe('Abebe');
  });
});
