import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** Identity state ONLY — server/device data lives in TanStack Query (AGENTS.md §6). */
export type AuthState = {
  token: string | null;
  user: { id: string; username: string } | null;
  activePerson: { id: string; name: string } | null;
  household: { id: string; name: string; code: string } | null;
  permissionMap: Record<string, boolean>;
};

const initialState: AuthState = {
  token: null,
  user: null,
  activePerson: null,
  household: null,
  permissionMap: {},
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Omit<AuthState, 'permissionMap'> & { permissionMap?: Record<string, boolean> }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.activePerson = action.payload.activePerson;
      state.household = action.payload.household;
      state.permissionMap = action.payload.permissionMap ?? {};
    },
    resetSession() {
      return initialState;
    },
  },
});

export const { setSession, resetSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
