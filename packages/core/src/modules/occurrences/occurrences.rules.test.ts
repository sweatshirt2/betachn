import { describe, expect, it } from 'vitest';
import type { OccurrenceSubtaskState } from '@chorify/db';
import { AppError } from '../../errors';
import { occurrenceRowSchema } from './occurrences.schema';
import {
  UNDO_WINDOW_MS,
  applyCompletion,
  applyReopen,
  applySkip,
  requirePending,
  type TransitionInput,
} from './occurrences.rules';

const base = (): TransitionInput => ({
  status: 'pending',
  subtaskStates: {
    st1: { done: false, personId: null },
    st2: { done: false, personId: 'p-daniel' },
  },
  completedByPersonId: null,
  completedAt: null,
  note: null,
  skipReason: null,
});

describe('occurrence transitions (§6.1–§6.7)', () => {
  it('completion marks every subtask done, keeping per-subtask assignees', () => {
    const at = new Date('2026-08-26T09:00:00Z');
    const patch = applyCompletion(base(), 'p-hana', at, 'all clean');

    expect(patch.status).toBe('completed');
    expect(patch.completedByPersonId).toBe('p-hana');
    expect(patch.completedAt).toBe(at);
    expect(patch.note).toBe('all clean');
    expect(patch.subtaskStates).toEqual({
      st1: { done: true, personId: 'p-hana' },
      st2: { done: true, personId: 'p-daniel' },
    });
  });

  it('completing a handled occurrence → ALREADY_DONE with who/when payload', () => {
    const existing = {
      ...base(),
      status: 'completed' as const,
      completedByPersonId: 'p-abebe',
      completedAt: new Date('2026-08-26T08:00:00Z'),
    };
    try {
      applyCompletion(existing, 'p-hana', new Date());
      throw new Error('should have thrown');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.code).toBe('ALREADY_DONE');
      expect(appErr.params).toEqual({
        completedByPersonId: 'p-abebe',
        completedAt: '2026-08-26T08:00:00.000Z',
      });
    }
  });

  it('skip works only on pending', () => {
    expect(applySkip(base(), 'guests coming').status).toBe('skipped');
    expect(() =>
      applySkip({ ...base(), status: 'missed' }, 'x').status,
    ).toThrowError(AppError);
  });

  it('undo window: completing actor within 10 minutes reopens; others/timeouts cannot', () => {
    const completedAt = new Date('2026-08-26T09:00:00Z');
    const existing = {
      ...base(),
      status: 'completed' as const,
      completedByPersonId: 'p-hana',
      completedAt,
    };
    const justAfter = new Date(completedAt.getTime() + UNDO_WINDOW_MS - 1000);

    const patch = applyReopen(existing, 'p-hana', justAfter);
    expect(patch.status).toBe('pending');
    expect(patch.subtaskStates).toBeUndefined(); // §6.7 untouched

    expect(() => applyReopen(existing, 'p-abebe', justAfter)).toThrowError(/Only the completing/);
    expect(() =>
      applyReopen(existing, 'p-hana', new Date(completedAt.getTime() + UNDO_WINDOW_MS + 1)),
    ).toThrowError(AppError);
  });

  it('subtask state shape survives roundtrip through the record schema', () => {
    const row = occurrenceRowSchema.parse({
      id: '0b9c4c34-7d2a-4a4e-9a2f-000000000001',
      householdId: '0b9c4c34-7d2a-4a4e-9a2f-000000000002',
      responsibilityId: '0b9c4c34-7d2a-4a4e-9a2f-000000000003',
      ruleId: '0b9c4c34-7d2a-4a4e-9a2f-000000000004',
      dueDate: '2026-08-26',
      personIds: ['0b9c4c34-7d2a-4a4e-9a2f-000000000005'],
      status: 'pending',
      completedByPersonId: null,
      completedAt: null,
      note: null,
      proofPath: null,
      skipReason: null,
      subtaskStates: {},
      createdAt: new Date(),
    });
    expect(Object.keys(row.subtaskStates)).toHaveLength(0);
  });
});
