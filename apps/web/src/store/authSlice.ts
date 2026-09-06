import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** Identity state ONLY — server/device data lives in TanStack Query (AGENTS.md §6). */
export type AuthState = {
  token: string | null;
  user: { id: string; username: string } | null;
  activePerson: { id: string; name: string } | null;
  household: { id: string; name: string; code: string } | null;
  permissionMap: Record<string, boolean>;
  /** Read-only preview target (§4.6) — mutations are blocked server-side. */
  viewAsPersonId: string | null;
};

const initialState: AuthState = {
  token: null,
  user: null,
  activePerson: null,
  household: null,
  permissionMap: {},
  viewAsPersonId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Omit<AuthState, 'permissionMap' | 'viewAsPersonId'> & { permissionMap?: Record<string, boolean> }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.activePerson = action.payload.activePerson;
      state.household = action.payload.household;
      state.permissionMap = action.payload.permissionMap ?? {};
      // A fresh session is never a preview — stale view-as must not survive.
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

export const { setSession, resetSession, enterViewAs, exitViewAs } = authSlice.actions;
export const authReducer = authSlice.reducer;
