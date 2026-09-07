/**
 * B1.2 two-device drill (§11.7 device half) — LIVE smoke against the dev
 * server. NOT part of `pnpm test` (needs web on :3000 + Postgres).
 *
 *   pnpm dev                     # separate shell (setsid nohup per §16.3)
 *   pnpm --filter @chorify/local-db exec tsx scripts/two-device-drill.ts
 *
 * Proves, with two real SQLite device DBs + real HTTP sync endpoints:
 *   S1  LWW by server arrival order; loser notified; winner NOT notified
 *   S2  loss notifications coalesce (one unread row, bumping count)
 *   S3  push domain re-auth rejects forbidden domains (D59); pull filters
 *       by permission domain (CN XIX-4) and symbolic audience (D61)
 *   S4  401 during push leaves pending_ops intact; next session flushes
 *   S5  bootstrap of a fresh device reflects the LWW-converged state
 *   S6  90-day-stale device auto-bootstraps instead of silently skipping
 */
import { rmSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { applyDeviceMigrations } from '../src/apply-migrations';
import { openNodeDevice, type NodeDevice } from '../src/client';
import { fetchSyncTransport, SyncEngine } from '../src/sync-engine';
import {
  deviceSyncState,
  households,
  notifications,
  pendingOps,
  people,
  supplies,
} from '../src/schema';

const BASE = process.env.SYNC_BASE_URL ?? 'http://localhost:3000';
const CODE = 'DRILLZ';
const USERNAME = 'drillhana';
const PASSWORD = 'drill123';

const devices: NodeDevice[] = [];
const failures: string[] = [];
let passed = 0;

function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code: string } }
    | null;
  if (!res.ok || !json || json.error) {
    throw new Error(`${method} ${path} → ${res.status} ${json?.error?.code ?? ''}`);
  }
  return json.data as T;
}

interface Session {
  token: string;
  household: { id: string; code: string; name: string };
  person: { id: string; name: string };
}

function contextSession(payload: { token: string; context: Record<string, never> }): Session {
  const ctx = payload.context as unknown as {
    household: Session['household'];
    activePerson: Session['person'];
  };
  return { token: payload.token, household: ctx.household, person: ctx.activePerson };
}

async function openDevice(file: string): Promise<NodeDevice> {
  rmSync(file, { force: true });
  const device = await openNodeDevice(file);
  devices.push(device);
  applyDeviceMigrations(device.migrations);
  return device;
}

async function engineFor(
  device: NodeDevice,
  session: { token: string | null; householdId: string; personId: string | null; code: string },
): Promise<SyncEngine> {
  return new SyncEngine(device.db, fetchSyncTransport(BASE), {
    token: () => session.token,
    householdCode: () => session.code,
    householdId: () => session.householdId,
    myPersonId: () => session.personId,
  });
}

function queueOp(
  device: NodeDevice,
  householdId: string,
  op: {
    uuid: string;
    entity: string;
    entityId: string;
    payload: Record<string, unknown>;
    domain?: 'household' | 'resources';
    audienceType?: 'members' | 'all';
    audienceIds?: string[];
  },
): void {
  void device.db.insert(pendingOps).values({
    uuid: op.uuid,
    householdId,
    entity: op.entity,
    entityId: op.entityId,
    op: 'update',
    payload: op.payload,
    audienceType: op.audienceType ?? 'all',
    audienceIds: op.audienceIds ?? [],
    domain: op.domain ?? 'household',
    createdAt: new Date().toISOString(),
  });
}

async function unreadByType(
  device: NodeDevice,
  recipientId: string,
  type: string,
): Promise<Array<{ params: Record<string, unknown> }>> {
  const rows = await device.db.select().from(notifications);
  return rows
    .filter((n) => n.recipientPersonId === recipientId && n.type === type && n.readAt === null)
    .map((n) => ({ params: n.paramsJson as Record<string, unknown> }));
}

type HouseholdRow = { id: string; name: string } & Record<string, unknown>;

async function localHousehold(device: NodeDevice): Promise<HouseholdRow> {
  const rows = await device.db.select().from(households);
  return rows[0] as HouseholdRow;
}

async function main(): Promise<void> {
  console.log(`\nB1.2 two-device drill → ${BASE}\n`);

  // ── Setup: register household (owner P1), create child person P2, device B
  //    joins via login + passwordless profile switch (§4.6), both bootstrap.
  const reg = await api<{ token: string; context: Record<string, never> }>(
    'POST', '/auth/register-online', null,
    { mode: 'phone', code: CODE, username: USERNAME, password: PASSWORD, phone: '+251911000001' },
  );
  const owner = contextSession(reg);
  console.log(`household ${owner.household.code} · owner ${owner.person.name}`);

  const roles = await api<Array<{ id: string; builtinKey: string | null }>>(
    'GET', '/roles', owner.token,
  );
  const childRole = roles.find((r) => r.builtinKey === 'child');
  check('setup: child role preset exists', childRole !== undefined);

  const child = await api<{ id: string }>('POST', '/people', owner.token, {
    name: 'Drill Child', roleId: childRole!.id,
  });

  const login = contextSession(
    await api<{ token: string; context: Record<string, never> }>('POST', '/auth/login', null, {
      code: CODE, username: USERNAME, password: PASSWORD,
    }),
  );
  await api('POST', '/profiles/switch', login.token, { personId: child.id });

  const deviceA = await openDevice('/tmp/chorify-drill-a.db');
  const engineA = await engineFor(deviceA, {
    token: owner.token, householdId: owner.household.id, personId: owner.person.id, code: CODE,
  });
  await engineA.bootstrap();
  const deviceB = await openDevice('/tmp/chorify-drill-b.db');
  const engineB = await engineFor(deviceB, {
    token: login.token, householdId: owner.household.id, personId: child.id, code: CODE,
  });
  await engineB.bootstrap();
  const peopleA = await deviceA.db.select().from(people);
  check('setup: both devices bootstrapped people+roles',
    peopleA.length >= 2 && (await deviceB.db.select().from(people)).length >= 2);

  // ── S1: LWW by arrival order — B pushes after A, B wins; only A notified.
  console.log('\nS1 concurrent writes to one row (LWW)');
  const hhA = await localHousehold(deviceA);
  const hhB = await localHousehold(deviceB);
  queueOp(deviceA, owner.household.id, {
    uuid: crypto.randomUUID(), entity: 'households', entityId: hhA.id,
    payload: { ...hhA, name: 'Alpha House' },
  });
  queueOp(deviceB, owner.household.id, {
    uuid: crypto.randomUUID(), entity: 'households', entityId: hhB.id,
    payload: { ...hhB, name: 'Beta House' },
  });
  await engineA.flush();
  await engineB.flush();

  const afterA1 = await localHousehold(deviceA);
  check('S1: A converges to B (later arrival wins)', afterA1.name === 'Beta House', afterA1.name);
  const lossesA = await unreadByType(deviceA, owner.person.id, 'sync.changeOverwritten');
  check('S1: loser (A) holds a loss notification', lossesA.length === 1);
  // A's op drained LAST flush — the loss arrives on THIS flush. Requires the
  // engine to remember its own pushed seq (cross-flush collision window).
  await engineA.flush();
  const lossesA2 = await unreadByType(deviceA, owner.person.id, 'sync.changeOverwritten');
  check('S1: cross-flush loss still notified on A', lossesA2.length === 1,
    `got ${lossesA2.length}`);
  const afterA2 = await localHousehold(deviceA);
  check('S1: A local row equals winner value', afterA2.name === 'Beta House', afterA2.name);
  await engineB.flush();
  const lossesB = await unreadByType(deviceB, child.id, 'sync.changeOverwritten');
  check('S1: winner (B) is NOT notified', lossesB.length === 0, `got ${lossesB.length}`);
  const afterB = await localHousehold(deviceB);
  check('S1: B local row never regresses to A value', afterB.name === 'Beta House', afterB.name);

  // ── S2: coalescing — A loses AGAIN on the same entity → one row, count 2.
  console.log('\nS2 loss notification coalescing');
  const hh2 = await localHousehold(deviceA);
  const hh2b = await localHousehold(deviceB);
  queueOp(deviceA, owner.household.id, {
    uuid: crypto.randomUUID(), entity: 'households', entityId: hh2.id,
    payload: { ...hh2, name: 'Gamma House' },
  });
  queueOp(deviceB, owner.household.id, {
    uuid: crypto.randomUUID(), entity: 'households', entityId: hh2b.id,
    payload: { ...hh2b, name: 'Delta House' },
  });
  await engineB.flush();
  await engineA.flush();
  const coalesced = await unreadByType(deviceA, owner.person.id, 'sync.changeOverwritten');
  check('S2: still ONE unread loss row', coalesced.length === 1, `got ${coalesced.length}`);
  check('S2: count bumped to 2', Number(coalesced[0]?.params.count ?? 0) === 2,
    `count=${String(coalesced[0]?.params.count)}`);
  check('S2: winner value Delta stands',
    (await localHousehold(deviceA)).name === 'Delta House');

  // ── S3: domain re-auth on push + domain/audience filtering on pull.
  console.log('\nS3 permission domain + audience filtering');
  const supplyId = crypto.randomUUID();
  queueOp(deviceB, owner.household.id, {
    uuid: crypto.randomUUID(), entity: 'supplies', entityId: supplyId,
    payload: { id: supplyId, householdId: owner.household.id, name: 'Soap', state: 'low', createdAt: new Date().toISOString() },
    domain: 'resources',
  });
  await engineB.flush();
  check('S3: child push to resources domain rejected',
    (await deviceB.db.select().from(pendingOps)).length === 0);
  const rejected = await unreadByType(deviceB, child.id, 'sync.changeRejected');
  check('S3: rejected push notifies child (sync is not a bypass)', rejected.length === 1);

  queueOp(deviceA, owner.household.id, {
    uuid: crypto.randomUUID(), entity: 'supplies', entityId: supplyId,
    payload: { id: supplyId, householdId: owner.household.id, name: 'Soap', state: 'low', createdAt: new Date().toISOString() },
    domain: 'resources',
  });
  await deviceA.db.insert(supplies).values({
    id: supplyId, householdId: owner.household.id, name: 'Soap', state: 'low',
  });
  await engineA.flush();

  const pullA = await api<{ changes: Array<{ entityId: string }> }>(
    'GET', `/sync/pull?since=0`, owner.token,
  );
  const pullB = await api<{ changes: Array<{ entityId: string }> }>(
    'GET', `/sync/pull?since=0`, login.token,
  );
  check('S3: owner pull sees resources change', pullA.changes.some((c) => c.entityId === supplyId));
  check('S3: child pull EXCLUDES resources change (domain gate)',
    !pullB.changes.some((c) => c.entityId === supplyId));

  const p2EmojiOp = {
    uuid: crypto.randomUUID(), entity: 'people', entityId: child.id,
    payload: { id: child.id, householdId: owner.household.id, name: 'Drill Child', avatarEmoji: '🧒', permissionOverrides: {}, roleId: childRole!.id },
    audienceType: 'members' as const, audienceIds: [child.id],
  };
  queueOp(deviceA, owner.household.id, p2EmojiOp);
  await engineA.flush();
  const pullB2 = await api<{ changes: Array<{ entityId: string }> }>(
    'GET', `/sync/pull?since=0`, login.token,
  );
  check('S3: members-scoped change reaches its member', pullB2.changes.some((c) => c.entityId === child.id));

  const p1Op = {
    uuid: crypto.randomUUID(), entity: 'people', entityId: owner.person.id,
    payload: { id: owner.person.id, householdId: owner.household.id, name: owner.person.name, avatarEmoji: '👑', permissionOverrides: {} },
    audienceType: 'members' as const, audienceIds: [owner.person.id],
  };
  queueOp(deviceA, owner.household.id, p1Op);
  await engineA.flush();
  const pullB3 = await api<{ changes: Array<{ entityId: string }> }>(
    'GET', `/sync/pull?since=0`, login.token,
  );
  check('S3: members-scoped change EXCLUDED from other members',
    !pullB3.changes.some((c) => c.entityId === owner.person.id));

  // ── S4: 401 during push keeps pending_ops; valid session flushes them.
  console.log('\nS4 401 resilience');
  const hh4 = await localHousehold(deviceA);
  const op401 = crypto.randomUUID();
  queueOp(deviceA, owner.household.id, {
    uuid: op401, entity: 'households', entityId: hh4.id,
    payload: { ...hh4, name: 'Delta House' },
  });
  const ghost = await engineFor(deviceA, {
    token: 'bogus-token', householdId: owner.household.id, personId: owner.person.id, code: CODE,
  });
  let threw = false;
  try { await ghost.flush(); } catch { threw = true; }
  check('S4: flush with dead token throws', threw);
  check('S4: pending_ops intact after 401',
    (await deviceA.db.select().from(pendingOps)).some((o) => o.uuid === op401));
  await engineA.flush();
  check('S4: valid session flushes the queue',
    (await deviceA.db.select().from(pendingOps)).length === 0);

  // ── S5: fresh device bootstrap reflects the LWW-converged state.
  console.log('\nS5 bootstrap freshness');
  const deviceC = await openDevice('/tmp/chorify-drill-c.db');
  const engineC = await engineFor(deviceC, {
    token: owner.token, householdId: owner.household.id, personId: owner.person.id, code: CODE,
  });
  await engineC.bootstrap();
  check('S5: bootstrapped household name = LWW winner (write-through)',
    (await localHousehold(deviceC)).name === 'Delta House',
    (await localHousehold(deviceC)).name);

  // ── S6: 90-day-stale device auto-bootstraps instead of silently skipping.
  console.log('\nS6 staleness auto-bootstrap');
  const stale = new Date(Date.now() - 91 * 24 * 3600 * 1000).toISOString();
  await deviceC.db
    .update(deviceSyncState)
    .set({ lastSuccessfulSyncAt: stale, cursor: '999999' })
    .where(eq(deviceSyncState.id, 'local'));
  queueOp(deviceC, owner.household.id, {
    uuid: crypto.randomUUID(), entity: 'households', entityId: (await localHousehold(deviceC)).id,
    payload: { ...(await localHousehold(deviceC)), name: 'Delta House' },
  });
  await engineC.flush();
  const cAfter = await localHousehold(deviceC);
  const cState = (await deviceC.db.select().from(deviceSyncState))[0];
  check('S6: stale device resynced (cursor back under head)',
    Number(cState?.cursor ?? 0) < 999999, `cursor=${String(cState?.cursor)}`);
  check('S6: stale device sees converged value after resync', cAfter.name === 'Delta House', cAfter.name);

  // ── Verdict
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('\nDRILL CRASHED:', err);
  process.exitCode = 1;
});
