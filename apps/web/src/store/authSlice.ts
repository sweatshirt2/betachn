import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { permissionMapFor } from '@chorify/core/permissions';
import { openBrowserDevice } from '@/lib/device/openDevice';
import { readDeviceSession } from '@/lib/device/createHousehold';
import * as schema from '@chorify/local-db/schema';

/**
 * Identity state ONLY — server/device data lives in TanStack Query and the
 * device DB (AGENTS.md §6). Two session modes share the identity fields so
 * shell UI renders identically; `mode` discriminates the data path:
 *  - 'server': Bearer-token API (synced households)
 *  - 'device': local-first device DB, sync engine owns replication (D49/A2)
 */
export type AuthState = {
  mode: 'server' | 'device';
  token: string | null;
  user: { id: string; username: string } | null;
  activePerson: { id: string; name: string } | null;
  household: { id: string; name: string; code: string } | null;
  permissionMap: Record<string, boolean>;
  /** Read-only preview target (§4.6) — mutations are blocked server-side. */
  viewAsPersonId: string | null;
  /**
   * Boot-time trust flag: a rehydrated server token is NOT valid until
   * GET /auth/me confirms it (stale-token guard). Device sessions validate
   * at rehydrate; server sessions via useSessionValidation.
   */
  sessionValidated: boolean;
};

export type DeviceSessionPayload = {
  household: { id: string; name: string; code: string };
  activePerson: { id: string; name: string };
  permissionMap: Record<string, boolean>;
};

const initialState: AuthState = {
  mode: 'server',
  token: null,
  user: null,
  activePerson: null,
  household: null,
  permissionMap: {},
  viewAsPersonId: null,
  sessionValidated: false,
};

/** A session exists in either mode — the single "am I signed in?" check. */
export function hasSession(state: AuthState): boolean {
  return state.mode === 'device' || state.token !== null;
}

/**
 * Rehydrate a device-mode session after a page reload (redux-persist restores
 * the slice, but device permissionMaps must be re-resolved against live role
 * rows — roles may have changed before the store rehydrated). Resolves to
 * null when the device DB is empty or unreachable — the slice treats that as
 * signed-out (zombie-session guard below). Server sessions re-resolve via
 * GET /me instead and need no device work.
 */
export const rehydrateDeviceSession = createAsyncThunk(
  'auth/rehydrateDeviceSession',
  async (): Promise<DeviceSessionPayload | null> => {
    const device = await openBrowserDevice();
    if (device.db === null) return null;
    const db = device.db;
    const household = (await db.select().from(schema.households)).at(0);
    if (!household) return null;
    const people = await db.select().from(schema.people);
    const roles = await db.select().from(schema.roles);
    // Resume the PERSISTED active person (localStorage session record) —
    // falling back to the first member only when the record is missing or
    // stale, never silently swapping profiles on reload.
    const persisted = readDeviceSession();
    const person =
      (persisted
        ? people.find((p) => p.householdId === household.id && p.id === persisted.activePersonId)
        : undefined) ??
      people.find((p) => p.householdId === household.id) ??
      null;
    if (!person) return null;
    const role = roles.find((r) => r.id === person.roleId) ?? null;
    const permissionMap = permissionMapFor({
      permissionOverrides: (person.permissionOverrides ?? {}) as never,
      role: role ? { isOwnerRole: role.isOwnerRole, permissions: role.permissions } : null,
    });
    return {
      household: { id: household.id, name: household.name, code: household.code },
      activePerson: { id: person.id, name: person.name },
      permissionMap,
    };
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(
      state,
      action: PayloadAction<
        Omit<AuthState, 'permissionMap' | 'viewAsPersonId' | 'mode' | 'sessionValidated'> & {
          permissionMap?: Record<string, boolean>;
        }
      >,
    ) {
      state.mode = 'server';
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.activePerson = action.payload.activePerson;
      state.household = action.payload.household;
      state.permissionMap = action.payload.permissionMap ?? {};
      // A fresh session is never a preview — stale view-as must not survive.
      state.viewAsPersonId = null;
      // A token straight from the server is valid by construction.
      state.sessionValidated = true;
    },
    setDeviceSession(state, action: PayloadAction<DeviceSessionPayload>) {
      state.mode = 'device';
      state.token = null;
      state.user = null;
      state.activePerson = action.payload.activePerson;
      state.household = action.payload.household;
      state.permissionMap = action.payload.permissionMap;
      state.viewAsPersonId = null;
      state.sessionValidated = true;
    },
    resetSession() {
      return initialState;
    },
    enterViewAs(state, action: PayloadAction<string>) {
      state.viewAsPersonId = action.payload;
    },
    exitViewAs(state) {
      state.viewAsPersonId = null;
    },
    /** Boot-time /auth/me confirmation (useSessionValidation). */
    markSessionValidated(state) {
      state.sessionValidated = true;
    },
  },
  // Device-session rehydration (Providers boot): a fulfilled run resolves the
  // freshly-read device state through the SAME fields as onboarding, and a
  // null payload resets to signed-out — a persisted device session whose OPFS
  // rows vanished (storage eviction, memory-tier fallback, wiped storage)
  // must not render the app shell against a nonexistent household.
  extraReducers: (builder) => {
    builder.addCase(rehydrateDeviceSession.fulfilled, (state, action) => {
      if (action.payload === null) return initialState;
      state.mode = 'device';
      state.token = null;
      state.user = null;
      state.activePerson = action.payload.activePerson;
      state.household = action.payload.household;
      state.permissionMap = action.payload.permissionMap;
      state.viewAsPersonId = null;
      // Rehydrated against live device rows — the local-first trust root.
      state.sessionValidated = true;
    });
  },
});

export const {
  setSession,
  setDeviceSession,
  resetSession,
  enterViewAs,
  exitViewAs,
  markSessionValidated,
} = authSlice.actions;
export const authReducer = authSlice.reducer;
