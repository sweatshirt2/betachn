import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { permissionMapFor } from '@chorify/core/permissions';
import { openBrowserDevice } from '@/lib/device/openDevice';
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
};

const initialState: AuthState = {
  mode: 'server',
  token: null,
  user: null,
  activePerson: null,
  household: null,
  permissionMap: {},
  viewAsPersonId: null,
};

/** A session exists in either mode — the single "am I signed in?" check. */
export function hasSession(state: AuthState): boolean {
  return state.mode === 'device' || state.token !== null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(
      state,
      action: PayloadAction<Omit<AuthState, 'permissionMap' | 'viewAsPersonId' | 'mode'> & { permissionMap?: Record<string, boolean> }>,
    ) {
      state.mode = 'server';
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.activePerson = action.payload.activePerson;
      state.household = action.payload.household;
      state.permissionMap = action.payload.permissionMap ?? {};
      // A fresh session is never a preview — stale view-as must not survive.
      state.viewAsPersonId = null;
    },
    setDeviceSession(
      state,
      action: PayloadAction<{
        household: { id: string; name: string; code: string };
        activePerson: { id: string; name: string };
        permissionMap: Record<string, boolean>;
      }>,
    ) {
      state.mode = 'device';
      state.token = null;
      state.user = null;
      state.activePerson = action.payload.activePerson;
      state.household = action.payload.household;
      state.permissionMap = action.payload.permissionMap;
      state.viewAsPersonId = null;
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
  },
});

export const { setSession, setDeviceSession, resetSession, enterViewAs, exitViewAs } = authSlice.actions;
export const authReducer = authSlice.reducer;

/**
 * Rehydrate a device-mode session after a page reload (redux-persist restores
 * the slice, but device permissionMaps must be re-resolved against live role
 * rows — roles may have changed before the store rehydrated). Server sessions
 * re-resolve via GET /me instead and need no device work.
 */
export const rehydrateDeviceSession = createAsyncThunk(
  'auth/rehydrateDeviceSession',
  async (): Promise<{
    household: { id: string; name: string; code: string };
    activePerson: { id: string; name: string };
    permissionMap: Record<string, boolean>;
  } | null> => {
    const device = await openBrowserDevice();
    if (device.db === null) return null;
    const db = device.db;
    const household = (await db.select().from(schema.households)).at(0);
    if (!household) return null;
    const people = await db.select().from(schema.people);
    const roles = await db.select().from(schema.roles);
    const person = people.find((p) => p.householdId === household.id) ?? null;
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
