import { FACTORY_MATRICES, permissionMapFor } from '@chorify/core/permissions';
import { AppError } from '@chorify/core/errors';
import { builtinRoleSeedRows } from '@chorify/core/roles-rules';
import { PendingOpQueue } from '@chorify/local-db/queue';
import * as schema from '@chorify/local-db/schema';
import type { BrowserDevice } from './openDevice';
import { openBrowserDevice } from './openDevice';
import { randomCode, randomId } from './random';

export type LocalHouseholdSeed = {
  householdId: string;
  code: string;
  ownerPersonId: string;
};

const DEVICE_SESSION_KEY = 'chorify-device-session';

export type DeviceSession = { householdId: string; activePersonId: string } | null;

export function readDeviceSession(): DeviceSession {
  try {
    const raw = localStorage.getItem(DEVICE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { householdId?: unknown; activePersonId?: unknown };
    if (typeof parsed.householdId === 'string' && typeof parsed.activePersonId === 'string') {
      return { householdId: parsed.householdId, activePersonId: parsed.activePersonId };
    }
    return null;
  } catch {
    return null;
  }
}

function writeDeviceSession(session: Exclude<DeviceSession, null>): void {
  localStorage.setItem(DEVICE_SESSION_KEY, JSON.stringify(session));
}

/**
 * Offline-local household creation (D49): zero credentials, device-resident.
 * Seeds the 11 builtin roles, clones Mother into the owner-permission role,
 * attaches the creator as a contactless (passwordless) person, and queues
 * every row in pending_ops for the future sync/registration push.
 */
export async function createLocalHousehold(input: {
  householdName: string;
  ownerName: string;
}): Promise<LocalHouseholdSeed> {
  const device: BrowserDevice = await openBrowserDevice();
  if (device.db === null) {
    throw new Error(
      device.capability === 'online-only'
        ? 'This browser cannot store offline data — use Chrome, Edge, Safari or Firefox.'
        : 'Offline storage is unavailable on this device.',
    );
  }
  const { db } = device;
  const queue = new PendingOpQueue(db as never);

  const householdId = randomId();
  const code = randomCode(6);
  const now = new Date().toISOString();

  await db.insert(schema.households).values({
    id: householdId,
    name: input.householdName.trim(),
    code,
    createdAt: now,
  });
  await queue.enqueue({
    uuid: randomId(),
    householdId,
    entity: 'households',
    entityId: householdId,
    op: 'create',
    payload: { id: householdId, name: input.householdName.trim(), code },
    audienceType: 'all',
    audienceIds: [],
    domain: 'household',
    createdAt: now,
  });

  for (const row of builtinRoleSeedRows(householdId)) {
    const id = randomId();
    await db.insert(schema.roles).values({ ...row, id, createdAt: now });
    await queue.enqueue({
      uuid: randomId(),
      householdId,
      entity: 'roles',
      entityId: id,
      op: 'create',
      payload: { ...row, id },
      audienceType: 'all',
      audienceIds: [],
      domain: 'household',
      createdAt: now,
    });
  }

  const ownerRoleId = randomId();
  const motherMatrix = FACTORY_MATRICES.mother;
  await db.insert(schema.roles).values({
    id: ownerRoleId,
    householdId,
    builtinKey: null,
    name: 'Mother',
    description: null,
    isOwnerRole: true,
    isBuiltin: false,
    permissions: { ...motherMatrix },
    defaultPermissions: { ...motherMatrix },
    createdAt: now,
  });

  const ownerPersonId = randomId();
  await db.insert(schema.people).values({
    id: ownerPersonId,
    householdId,
    name: input.ownerName.trim(),
    roleId: ownerRoleId,
    createdAt: now,
  });
  await queue.enqueue({
    uuid: randomId(),
    householdId,
    entity: 'people',
    entityId: ownerPersonId,
    op: 'create',
    payload: { id: ownerPersonId, name: input.ownerName.trim(), roleId: ownerRoleId },
    audienceType: 'all',
    audienceIds: [],
    domain: 'household',
    createdAt: now,
  });

  writeDeviceSession({ householdId, activePersonId: ownerPersonId });
  return { householdId, code, ownerPersonId };
}

export type DeviceDb = Exclude<Awaited<ReturnType<typeof openBrowserDevice>>, { db: null }>['db'];

/** Extra household member (passwordless quick-switch profile, D49). */
export async function addLocalPerson(
  db: DeviceDb,
  input: { householdId: string; name: string; roleId: string | null },
): Promise<string> {
  const now = new Date().toISOString();
  const id = randomId();
  await db.insert(schema.people).values({
    id,
    householdId: input.householdId,
    name: input.name.trim(),
    roleId: input.roleId,
    createdAt: now,
  });
  await new PendingOpQueue(db as never).enqueue({
    uuid: randomId(),
    householdId: input.householdId,
    entity: 'people',
    entityId: id,
    op: 'create',
    payload: { id, name: input.name.trim(), roleId: input.roleId },
    audienceType: 'all',
    audienceIds: [],
    domain: 'household',
    createdAt: now,
  });
  return id;
}

/** builtinKey → role id for the member-role picker. */
export async function localRoleMap(db: DeviceDb, householdId: string): Promise<Record<string, string>> {
  const rows = await db.select().from(schema.roles);
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row.householdId === householdId && row.builtinKey) map[row.builtinKey] = row.id;
  }
  return map;
}

/** The payload setDeviceSession consumes — same shape as the rehydrate thunk's. */
export type DeviceSwitchResult = {
  household: { id: string; name: string; code: string };
  activePerson: { id: string; name: string };
  permissionMap: Record<string, boolean>;
};

/**
 * Device-mode profile switch (§4.6): every device person is passwordless
 * (D49), so switching is instant — persist the new active person, re-resolve
 * their permissionMap from live role rows, and return the session payload.
 * The caller dispatches setDeviceSession + clears TanStack caches (D38).
 */
export async function switchDeviceProfile(personId: string): Promise<DeviceSwitchResult> {
  const device = await openBrowserDevice();
  if (device.db === null) {
    throw new Error('Offline storage is unavailable on this device.');
  }
  const db = device.db;
  const household = (await db.select().from(schema.households)).at(0);
  if (!household) throw new AppError('NOT_FOUND', 'No household on this device');
  const person = (await db.select().from(schema.people)).find(
    (p) => p.id === personId && p.householdId === household.id,
  );
  if (!person) throw new AppError('NOT_FOUND', 'Person not found');
  const role = (await db.select().from(schema.roles)).find((r) => r.id === person.roleId) ?? null;
  const permissionMap = permissionMapFor({
    permissionOverrides: (person.permissionOverrides ?? {}) as never,
    role: role ? { isOwnerRole: role.isOwnerRole, permissions: role.permissions } : null,
  });
  writeDeviceSession({ householdId: household.id, activePersonId: person.id });
  return {
    household: { id: household.id, name: household.name, code: household.code },
    activePerson: { id: person.id, name: person.name },
    permissionMap,
  };
}
