import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { applyDeviceMigrations } from './apply-migrations';
import { openNodeDevice, type NodeDevice } from './client';
import {
  activityEvents,
  assignmentRules,
  households,
  notifications,
  notificationPrefs,
  occurrences,
  people,
  responsibilities,
  roles,
} from './schema';
import { deviceDueTodayDigest, deviceSweepMissed, runDeviceJobs } from './jobs';

const devices: NodeDevice[] = [];
afterAll(() => {
  for (const device of devices) device.sqlite.close();
});

let db: NodeDevice['db'];
let device: NodeDevice;

const OWNER_ROLE = 'role-owner';
const CHILD_ROLE = 'role-child';
const OWNER = 'person-owner';
const CHILD = 'person-child';
const HH = 'hh1';
const TZ = 'Africa/Addis_Ababa';

function isoDay(offsetDays: number): string {
  // Resolve the BASE day in the job's timezone (Africa/Addis_Ababa), not the
  // machine clock's UTC — otherwise running this suite between 21:00 UTC
  // (Addis midnight) and 00:00 UTC makes isoDay(0) land "yesterday" and the
  // sweep/digest expectations flip. The offset is still applied in UTC days.
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const d = new Date(`${today}T12:00:00Z`); // noon UTC is safe: never straddles a day boundary in either tz
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

beforeEach(async () => {
  device = await openNodeDevice(':memory:');
  devices.push(device);
  applyDeviceMigrations(device.migrations);
  db = device.db;
  await db.insert(households).values({
    id: HH, name: 'Test Household', code: 'TESTHH',
  });
  await db.insert(roles).values([
    {
      id: OWNER_ROLE, householdId: HH, name: 'Owner', isBuiltin: false, isOwnerRole: true,
      permissions: {}, defaultPermissions: {},
    },
    {
      id: CHILD_ROLE, householdId: HH, name: 'Child', isBuiltin: false, isOwnerRole: false,
      permissions: {}, defaultPermissions: {},
    },
  ]);
  await db.insert(people).values([
    { id: OWNER, householdId: HH, name: 'Owner', roleId: OWNER_ROLE },
    { id: CHILD, householdId: HH, name: 'Child', roleId: CHILD_ROLE },
  ]);
  await db.insert(responsibilities).values([
    { id: 'res1', householdId: HH, title: 'Trash' },
    { id: 'res2', householdId: HH, title: 'Dishes' },
  ]);
  await db.insert(assignmentRules).values([
    { id: 'r1', responsibilityId: 'res1', pattern: 'daily', startDate: isoDay(-3), personIds: [] },
    { id: 'r2', responsibilityId: 'res2', pattern: 'daily', startDate: isoDay(-3), personIds: [] },
  ]);
});

describe('device jobs (D64)', () => {
  it('sweeps stale pending → missed with activity + owner notifications', async () => {
    await db.insert(occurrences).values([
      { id: 'o1', householdId: HH, responsibilityId: 'res1', ruleId: 'r1', dueDate: isoDay(-2), personIds: [CHILD], status: 'pending' },
      { id: 'o2', householdId: HH, responsibilityId: 'res2', ruleId: 'r2', dueDate: isoDay(0), personIds: [CHILD], status: 'pending' },
    ]);

    const swept = await deviceSweepMissed(db, HH, TZ);
    expect(swept).toBe(1);

    const rows = await db.select().from(occurrences);
    expect(rows.find((r) => r.id === 'o1')?.status).toBe('missed');
    expect(rows.find((r) => r.id === 'o2')?.status).toBe('pending');

    const events = await db.select().from(activityEvents);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('occurrence.missed');
    expect((events[0]?.payload as Record<string, unknown>).title).toBe('Trash');

    const notes = await db.select().from(notifications);
    expect(notes).toHaveLength(1); // owner only, minus nobody (no actor)
    expect(notes[0]?.recipientPersonId).toBe(OWNER);
    expect(notes[0]?.type).toBe('notify.missed.detected');
  });

  it('sweep is idempotent', async () => {
    await db.insert(occurrences).values({
      id: 'o1', householdId: HH, responsibilityId: 'res1', ruleId: 'r1', dueDate: isoDay(-1), personIds: [], status: 'pending',
    });
    expect(await deviceSweepMissed(db, HH, TZ)).toBe(1);
    expect(await deviceSweepMissed(db, HH, TZ)).toBe(0);
  });

  it('digest: one per person per day, prefs-gated, with preview titles', async () => {
    await db.insert(occurrences).values([
      { id: 'o1', householdId: HH, responsibilityId: 'res1', ruleId: 'r1', dueDate: isoDay(0), personIds: [CHILD], status: 'pending' },
      { id: 'o2', householdId: HH, responsibilityId: 'res2', ruleId: 'r2', dueDate: isoDay(0), personIds: [CHILD, OWNER], status: 'pending' },
    ]);

    const digests = await deviceDueTodayDigest(db, HH, TZ);
    expect(digests).toBe(2); // ONE per person (D11): child coalesces 2 chores, owner 1
  });

  it('digest dedupes per person per day', async () => {
    await db.insert(occurrences).values({
      id: 'o1', householdId: HH, responsibilityId: 'res1', ruleId: 'r1', dueDate: isoDay(0), personIds: [CHILD], status: 'pending',
    });
    expect(await deviceDueTodayDigest(db, HH, TZ)).toBe(1);
    expect(await deviceDueTodayDigest(db, HH, TZ)).toBe(0);
  });

  it('digest respects reminder=false prefs', async () => {
    await db.insert(notificationPrefs).values({
      personId: CHILD, categories: { reminder: false },
    });
    await db.insert(occurrences).values({
      id: 'o1', householdId: HH, responsibilityId: 'res1', ruleId: 'r1', dueDate: isoDay(0), personIds: [CHILD], status: 'pending',
    });
    expect(await deviceDueTodayDigest(db, HH, TZ)).toBe(0);
  });

  it('runDeviceJobs sweeps then digests in one pass', async () => {
    await db.insert(occurrences).values([
      { id: 'o1', householdId: HH, responsibilityId: 'res1', ruleId: 'r1', dueDate: isoDay(-1), personIds: [CHILD], status: 'pending' },
      { id: 'o2', householdId: HH, responsibilityId: 'res2', ruleId: 'r1', dueDate: isoDay(0), personIds: [CHILD], status: 'pending' },
    ]);
    const result = await runDeviceJobs(db, HH, TZ);
    expect(result.swept).toBe(1);
    expect(result.digests).toBe(1); // only today's pending; o1 is missed already
  });
});
