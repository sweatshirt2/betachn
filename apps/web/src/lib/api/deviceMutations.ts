'use client';

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { store, type RootState } from '@/store';
import { ApiError } from './client';

/** Device-mode identity at call time — RTK slice is the single source. */
export function selectDeviceIdentity(state: RootState): { householdId: string; actorPersonId: string } {
  const { household, activePerson } = state.auth;
  if (!household || !activePerson) {
    throw new Error('Device session is missing household/person identity');
  }
  return { householdId: household.id, actorPersonId: activePerson.id };
}

/** AppError carries the frozen code set; plain Errors become 500 INTERNAL (D80). */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const maybe = err as { code?: unknown; httpStatus?: unknown; params?: Record<string, unknown> };
  if (typeof maybe?.code === 'string') {
    return new ApiError(
      typeof maybe.httpStatus === 'number' ? maybe.httpStatus : 400,
      { code: maybe.code, message: err instanceof Error ? err.message : 'Device write failed', params: maybe.params },
    );
  }
  return new ApiError(500, {
    code: 'INTERNAL',
    message: err instanceof Error ? err.message : 'Device write failed',
  });
}

type DeviceMutationConfig<TData, TVariables> = {
  /**
   * Converts variables into a device write through `lib/device/writes` —
   * apply-locally-first, then queue in pending_ops (D58/D64).
   */
  write: (variables: TVariables, identity: { householdId: string; actorPersonId: string }) => Promise<TData>;
  options?: Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'>;
};

/**
 * Device-mode twin of `useApiMutation` (Phase A3): same TVariables/TData
 * shapes and the same options object, so feature hooks can compose
 * server-vs-device pairs and return one per `auth.mode` without changing
 * component code. Errors normalize to ApiError so frozen-code handling
 * (ALREADY_DONE, CONFLICT, …) keeps working on device writes.
 */
export function useDeviceMutation<TData, TVariables = unknown>(config: DeviceMutationConfig<TData, TVariables>) {
  const mode = useSelector((state: RootState) => state.auth.mode);
  return useMutation<TData, ApiError, TVariables>({
    ...config.options,
    mutationFn: async (variables) => {
      if (mode !== 'device') throw new Error('Device mutation used outside device mode');
      try {
        return await config.write(variables, selectDeviceIdentity(store.getState()));
      } catch (err) {
        throw toApiError(err);
      }
    },
  });
}
