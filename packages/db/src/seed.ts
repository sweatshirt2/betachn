import { hash } from '@node-rs/argon2';
import { sql } from 'drizzle-orm';
import {
  BUILTIN_ROLE_KEYS,
  FACTORY_MATRICES,
  addDays,
  expandRule,
  type BuiltinRoleKey,
  type ExpandableRule,
} from '@chorify/core';
import { db, pool } from './client';
import {
  activityEvents,
  assets,
  assignmentRules,
  blocklistWords,
  households,
  occurrences,
  people,
  responsibilities,
  roles,
  rooms,
  serviceRecords,
  shoppingItems,
  supplies,
  users,
} from './models';

const TZ = 'Africa/Addis_Ababa';

/** Current date in the household timezone as YYYY-MM-DD (en-CA gives ISO). */
function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function mondayOf(iso: string): string {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  const back = (dow + 6) % 7; // days since Monday
  return addDays(iso, -back);
}

async function main(): Promise<void> {
  // Deterministic fixture: wipe and reinsert on every run.
  await db.execute(sql`
    TRUNCATE households, users, sessions, people, roles, routines, responsibilities,
      subtasks, assignment_rules, occurrences, rooms, assets, service_records,
      supplies, shopping_items, activity_events, notifications, notification_prefs,
      jobs_audit, oauth_accounts, household_changes RESTART IDENTITY CASCADE
  `);


  // ── Household-code blocklist (config-like; idempotent) ───────────────────
  const STARTER_BLOCKLIST = [
    'anal', 'anus', 'bastard', 'bitch', 'boobs', 'cock', 'cunt', 'dick', 'fag',
    'fart', 'fuck', 'hitler', 'jihad', 'nazi', 'nigger', 'penis', 'porn', 'pussy',
    'rape', 'sex', 'shit', 'slut', 'terror', 'vagina', 'whore',
  ];
  await db
    .insert(blocklistWords)
    .values(STARTER_BLOCKLIST.map((word) => ({ word })))
    .onConflictDoNothing();
  const today = todayISO();

  // ── Household ────────────────────────────────────────────────────────────
  const [household] = await db
    .insert(households)
    .values({ name: 'Bekele Family', code: 'BEKELE' })
    .returning();
  if (!household) throw new Error('seed: household insert failed');

  // ── Roles: 11 builtins + Hana's owner clone of Mother ────────────────────
  const builtinRoleIds = new Map<BuiltinRoleKey, string>();
  for (const key of BUILTIN_ROLE_KEYS) {
    const matrix = FACTORY_MATRICES[key];
    const [row] = await db
      .insert(roles)
      .values({
        householdId: household.id,
        builtinKey: key,
        name: key,
        isBuiltin: true,
        permissions: matrix,
        defaultPermissions: matrix,
      })
      .returning();
    if (row) builtinRoleIds.set(key, row.id);
  }
  const motherMatrix = FACTORY_MATRICES.mother;
  const [ownerRole] = await db
    .insert(roles)
    .values({
      householdId: household.id,
      name: 'Mother',
      description: 'Household owner role (cloned from preset)',
      isOwnerRole: true,
      isBuiltin: false,
      permissions: motherMatrix,
      defaultPermissions: motherMatrix,
    })
    .returning();
  if (!ownerRole) throw new Error('seed: owner role insert failed');

  // ── People ───────────────────────────────────────────────────────────────
  const personRows = await db
    .insert(people)
    .values([
      {
        householdId: household.id,
        name: 'Hana',
        sex: 'female' as const,
        avatarEmoji: '👩🏽',
        roleId: ownerRole.id,
      },
      {
        householdId: household.id,
        name: 'Abebe',
        sex: 'male' as const,
        avatarEmoji: '👨🏽',
        roleId: builtinRoleIds.get('father'),
      },
      {
        householdId: household.id,
        name: 'Daniel',
        sex: 'male' as const,
        birthDate: addDays(today, -Math.round(13 * 365.25)),
        avatarEmoji: '🧑🏽',
        roleId: builtinRoleIds.get('responsible_child'),
      },
      {
        householdId: household.id,
        name: 'Sami',
        sex: 'male' as const,
        birthDate: addDays(today, -Math.round(8 * 365.25)),
        avatarEmoji: '👦🏽',
        roleId: builtinRoleIds.get('child'),
      },
      {
        householdId: household.id,
        name: 'Sara',
        sex: 'female' as const,
        avatarEmoji: '👩🏾',
        roleId: builtinRoleIds.get('guardian'),
      },
    ])
    .returning();
  const byName = new Map(personRows.map((p) => [p.name, p]));
  const hana = byName.get('Hana');
  const abebe = byName.get('Abebe');
  const daniel = byName.get('Daniel');
  const sami = byName.get('Sami');
  if (!hana || !abebe || !daniel || !sami) throw new Error('seed: person rows missing');

  // ── Account: hana / hana1234 ─────────────────────────────────────────────
  await db.insert(users).values({
    username: 'hana',
    passwordHash: await hash('hana1234'),
    personId: hana.id,
    householdId: household.id,
  });

  // ── Home ─────────────────────────────────────────────────────────────────
  const roomRows = await db
    .insert(rooms)
    .values([
      { householdId: household.id, name: 'Kitchen', icon: '🍳' },
      { householdId: household.id, name: 'Living Room', icon: '🛋️' },
    ])
    .returning();
  const kitchen = roomRows.find((r) => r.name === 'Kitchen');

  const [washer] = await db
    .insert(assets)
    .values({
      householdId: household.id,
      roomId: kitchen?.id ?? null,
      name: 'Washing Machine',
      icon: '🌀',
      maintenanceIntervalDays: 60,
    })
    .returning();
  if (!washer) throw new Error('seed: asset insert failed');
  await db.insert(serviceRecords).values({
    assetId: washer.id,
    servicedOn: addDays(today, -40),
    note: 'Cleaned filter and drain pump',
  });

  // ── Responsibilities & rules ─────────────────────────────────────────────
  const respRows = await db
    .insert(responsibilities)
    .values([
      {
        householdId: household.id,
        title: 'Laundry',
        icon: '🧺',
        roomId: null,
        createdByPersonId: hana.id,
      },
      {
        householdId: household.id,
        title: 'Trash',
        icon: '🗑️',
        createdByPersonId: hana.id,
      },
      {
        householdId: household.id,
        title: 'Dishes',
        icon: '🍽️',
        roomId: kitchen?.id ?? null,
        createdByPersonId: hana.id,
      },
    ])
    .returning();
  const respId = new Map(respRows.map((r) => [r.title, r.id]));

  const ruleSpecs: Array<{ title: string; rule: ExpandableRule }> = [
    {
      title: 'Laundry',
      rule: {
        pattern: 'weekly',
        daysOfWeek: [1],
        startDate: mondayOf(addDays(today, -6)), // last Monday guaranteed inside window
        personIds: [hana.id],
      },
    },
    {
      title: 'Trash',
      rule: {
        pattern: 'daily',
        startDate: addDays(today, -6),
        personIds: [],
        rotation: { periodDays: 1, personIds: [daniel.id, sami.id] },
      },
    },
    {
      title: 'Dishes',
      rule: {
        pattern: 'daily',
        startDate: addDays(today, -6),
        personIds: [abebe.id],
      },
    },
  ];

  const ruleIds: Array<{ id: string; title: string; rule: ExpandableRule }> = [];
  for (const spec of ruleSpecs) {
    const responsibilityId = respId.get(spec.title);
    if (!responsibilityId) throw new Error(`seed: missing responsibility ${spec.title}`);
    const [row] = await db
      .insert(assignmentRules)
      .values({ responsibilityId, ...spec.rule })
      .returning();
    if (row) ruleIds.push({ id: row.id, ...spec });
  }

  // ── Occurrences: past week history + pending through generator horizon ───
  const windowStart = addDays(today, -6);
  const horizonEnd = addDays(today, 13);
  const historyRows: (typeof occurrences.$inferInsert)[] = [];

  for (const { id: ruleId, title, rule } of ruleIds) {
    for (const hit of expandRule(rule, windowStart, horizonEnd)) {
      const past = hit.date < today;
      let status: 'pending' | 'completed' | 'missed' = 'pending';
      let completedByPersonId: string | null = null;
      let completedAt: Date | null = null;

      if (past && title === 'Dishes') {
        status = 'completed';
        completedByPersonId = abebe.id;
        completedAt = new Date(`${hit.date}T16:00:00Z`);
      } else if (past && title === 'Trash') {
        if (hit.date === addDays(today, -2)) {
          status = 'missed'; // the single missed demo occurrence
        } else {
          status = 'completed';
          completedByPersonId = hit.personIds[0] ?? null;
          completedAt = new Date(`${hit.date}T15:00:00Z`);
        }
      } else if (past && title === 'Laundry') {
        status = 'completed';
        completedByPersonId = hana.id;
        completedAt = new Date(`${hit.date}T12:00:00Z`);
      }

      historyRows.push({
        householdId: household.id,
        responsibilityId: respId.get(title) ?? '',
        ruleId,
        dueDate: hit.date,
        personIds: hit.personIds,
        status,
        completedByPersonId,
        completedAt,
      });
    }
  }
  await db.insert(occurrences).values(historyRows).onConflictDoNothing();

  // ── Supplies & shopping ──────────────────────────────────────────────────
  const supplyRows = await db
    .insert(supplies)
    .values([
      { householdId: household.id, name: 'Detergent', state: 'low' as const, note: 'One scoop left' },
      { householdId: household.id, name: 'Rice', state: 'available' as const },
      { householdId: household.id, name: 'Coffee', state: 'available' as const },
    ])
    .returning();
  const detergent = supplyRows.find((s) => s.name === 'Detergent');

  await db.insert(shoppingItems).values([
    {
      householdId: household.id,
      name: 'Detergent',
      quantityText: '1 bottle',
      sourceSupplyId: detergent?.id ?? null,
    },
    { householdId: household.id, name: 'Teff flour', quantityText: '5 kg', category: 'Market' },
  ]);

  // ── Activity story (localized keys, never prose) ─────────────────────────
  const events: (typeof activityEvents.$inferInsert)[] = [
    {
      householdId: household.id,
      actorPersonId: hana.id,
      type: 'person.added',
      payload: { name: 'Sami' },
      domain: 'household',
    },
    {
      householdId: household.id,
      actorPersonId: hana.id,
      type: 'supply.low',
      payload: { name: 'Detergent' },
      domain: 'resources',
    },
  ];
  for (const occ of historyRows) {
    if (occ.status === 'completed' && occ.dueDate === addDays(today, -1)) {
      events.push({
        householdId: household.id,
        actorPersonId: occ.completedByPersonId,
        type: 'responsibility.completed',
        payload: { title: 'Dishes' },
        domain: 'responsibilities',
      });
    }
    if (occ.status === 'missed') {
      events.push({
        householdId: household.id,
        actorPersonId: null,
        type: 'occurrence.missed',
        payload: { title: 'Trash' },
        domain: 'responsibilities',
      });
    }
  }
  await db.insert(activityEvents).values(events);

  console.log(`seeded Bekele Family — login hana / hana1234 (${historyRows.length} occurrences)`);
}

main()
  .then(async () => {
    const result = await db.execute(sql`select count(*)::int as count from users where username='hana'`);
    const count = Number(result.rows[0]?.count ?? 0);
    if (count !== 1) throw new Error('seed verification failed: hana user row missing');
    console.log('verified: hana login row exists');
    await pool.end();
  })
  .catch(async (err) => {
    console.error('seed failed:', err);
    await pool.end();
    process.exitCode = 1;
  });
