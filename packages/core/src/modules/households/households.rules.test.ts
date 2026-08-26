import { describe, expect, it } from 'vitest';
import { AppError } from '../../errors';
import type { BlocklistChecker, RandomSource } from '../../ports';
import {
  generateUniqueHouseholdCode,
  isPlausibleHouseholdCode,
  normalizeHouseholdCode,
} from './households.rules';

/** Deterministic fake: replays scripted strings, then a safe fallback. */
function fakeRandom(script: string[]): RandomSource {
  const queue = [...script];
  return {
    nextString: () => queue.shift() ?? 'ZZZZZZ',
    nextInt: () => 0,
  };
}

const neverBlocked = (): BlocklistChecker => ({ isBlocked: () => false });
const alwaysBlocked = (): BlocklistChecker => ({ isBlocked: () => true });

describe('household codes (D52)', () => {
  it('plausibility accepts exactly six A-Z letters', () => {
    expect(isPlausibleHouseholdCode('BEKELE')).toBe(true);
    expect(isPlausibleHouseholdCode('ABCDEF')).toBe(true);
    expect(isPlausibleHouseholdCode('BEKEL')).toBe(false);
    expect(isPlausibleHouseholdCode('BEKELE1')).toBe(false);
    expect(isPlausibleHouseholdCode('bekele')).toBe(false); // storage is canonical uppercase
  });

  it('normalizes login input to uppercase-canonical', () => {
    expect(normalizeHouseholdCode('  bekele ')).toBe('BEKELE');
  });

  it('skips taken codes and returns the first free one', async () => {
    const taken = new Set(['AAAAAA']);
    const code = await generateUniqueHouseholdCode(
      fakeRandom(['AAAAAA', 'BBBBBB']),
      async (c) => taken.has(c),
      neverBlocked(),
    );
    expect(code).toBe('BBBBBB');
  });

  it('skips blocklisted codes before consulting collisions', async () => {
    const seen: string[] = [];
    const code = await generateUniqueHouseholdCode(
      fakeRandom(['FUCKKK', 'CCCCCC']),
      async (c) => {
        seen.push(c);
        return false;
      },
      { isBlocked: (w) => w === 'fuckkk' },
    );
    expect(code).toBe('CCCCCC');
    expect(seen).toEqual(['CCCCCC']); // blocklisted draw never reached the DB
  });

  it('throws CONFLICT after exhausting attempts', async () => {
    await expect(
      generateUniqueHouseholdCode(fakeRandom([]), async () => true, alwaysBlocked()),
    ).rejects.toBeInstanceOf(AppError);
  });
});
