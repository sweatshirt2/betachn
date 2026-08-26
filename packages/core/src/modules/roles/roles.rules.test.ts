import { describe, expect, it } from 'vitest';
import { FACTORY_MATRICES, customRoleBaseline } from '../../permissions';
import { lastOwnerBlockers, resetMatrixFor } from './roles.rules';

describe('role reset semantics (CN §17 / invariant 14)', () => {
  it('builtins restore the factory matrix regardless of later edits', () => {
    const role = {
      builtinKey: 'guardian',
      isBuiltin: true,
      defaultPermissions: customRoleBaseline(),
      permissions: customRoleBaseline(), // drifted live matrix
    };
    expect(resetMatrixFor(role)).toEqual(FACTORY_MATRICES.guardian);
  });

  it('custom roles restore their create-time snapshot', () => {
    const snapshot = customRoleBaseline();
    const role = {
      builtinKey: null,
      isBuiltin: false,
      defaultPermissions: snapshot,
      permissions: FACTORY_MATRICES.mother,
    };
    expect(resetMatrixFor(role)).toEqual(snapshot);
    expect(resetMatrixFor(role)).not.toBe(snapshot); // defensive copy
  });
});

describe('LAST_OWNER blockers (§6.20)', () => {
  it('blocks when zero owner holders would remain', () => {
    expect(lastOwnerBlockers(0)).toEqual(['LAST_OWNER']);
  });

  it('allows when at least one other holder remains', () => {
    expect(lastOwnerBlockers(1)).toEqual([]);
    expect(lastOwnerBlockers(3)).toEqual([]);
  });
});
