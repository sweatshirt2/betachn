import { AppError } from '../../errors';
import type { OccurrenceSubtaskState } from '@chorify/db';
import type { OccurrenceStatus } from './occurrences.schema';

/**
 * Pure occurrence-transition patches (§6.1–§6.7). Device stack reuses these
 * verbatim when applying local-first mutations (D58/D67) — server service and
 * offline applier cannot drift.
 */

/** §4.9 ALREADY_DONE payload: first-write-wins evidence for stale replays. */
function alreadyDone(existing: {
  status: OccurrenceStatus;
  completedByPersonId: string | null;
  completedAt: Date | null;
}): AppError {
  return new AppError('ALREADY_DONE', 'This occurrence was already handled', {
    completedByPersonId: existing.completedByPersonId,
    completedAt: existing.completedAt?.toISOString() ?? null,
  });
}

export interface TransitionInput {
  status: OccurrenceStatus;
  subtaskStates: Record<string, OccurrenceSubtaskState>;
  completedByPersonId: string | null;
  completedAt: Date | null;
  note: string | null;
  skipReason: string | null;
}

export function applyCompletion(
  existing: TransitionInput,
  actorPersonId: string,
  completedAt: Date,
  note?: string,
): Partial<TransitionInput> {
  if (existing.status !== 'pending') throw alreadyDone(existing);
  // §6.7: completing marks ALL subtasks done; original per-subtask assignees stay.
  const subtaskStates: Record<string, OccurrenceSubtaskState> = {};
  for (const [subtaskId, state] of Object.entries(existing.subtaskStates)) {
    subtaskStates[subtaskId] = {
      done: true,
      personId: state.personId ?? actorPersonId,
    };
  }
  return {
    status: 'completed',
    completedByPersonId: actorPersonId,
    completedAt,
    ...(note !== undefined ? { note } : {}),
    subtaskStates,
  };
}

export function applySkip(
  existing: TransitionInput,
  skipReason?: string,
): Partial<TransitionInput> {
  if (existing.status !== 'pending') throw alreadyDone(existing);
  return { status: 'skipped', ...(skipReason !== undefined ? { skipReason } : {}) };
}

export const UNDO_WINDOW_MS = 10 * 60 * 1000;

export function applyReopen(
  existing: TransitionInput & { completedByPersonId: string | null; completedAt: Date | null },
  actorPersonId: string,
  now: Date,
): Partial<TransitionInput> {
  if (existing.status === 'pending') {
    return {}; // idempotent no-op — nothing to reopen
  }
  if (existing.status !== 'completed') throw alreadyDone(existing);
  const byCompletingActor = existing.completedByPersonId === actorPersonId;
  const withinWindow =
    existing.completedAt !== null && now.getTime() - existing.completedAt.getTime() <= UNDO_WINDOW_MS;
  if (!byCompletingActor || !withinWindow) {
    throw new AppError('CONFLICT', 'Only the completing person can undo within 10 minutes');
  }
  // §6.7: subtaskStates left untouched; completion metadata cleared.
  return { status: 'pending', completedByPersonId: null, completedAt: null };
}

/** Pending-only check shared by reassign (§6.2) — patch built by the service. */
export function requirePending(status: OccurrenceStatus): void {
  if (status !== 'pending') throw alreadyDone({ ...emptyExisting(), status });
}

function emptyExisting() {
  return {
    completedByPersonId: null as string | null,
    completedAt: null as Date | null,
  };
}
