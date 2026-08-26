import { AppError } from '../../errors';
import type { BlocklistChecker, RandomSource } from '../../ports';

export const HOUSEHOLD_CODE_LENGTH = 6;
export const HOUSEHOLD_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_CODE_ATTEMPTS = 8;

/** D52: exactly six A-Z letters. */
export function isPlausibleHouseholdCode(value: string): boolean {
  return new RegExp(`^[${HOUSEHOLD_CODE_ALPHABET}]{${HOUSEHOLD_CODE_LENGTH}}$`).test(value);
}

/** Login input is case-insensitive; storage/display are uppercase-canonical. */
export function normalizeHouseholdCode(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Generates a blocklist-safe, collision-free household code (D52).
 * Collision source and blocklist are injected ports — pure orchestration,
 * fully testable without a database.
 */
export async function generateUniqueHouseholdCode(
  random: RandomSource,
  isTaken: (code: string) => Promise<boolean>,
  blocklist: BlocklistChecker,
): Promise<string> {
  const maxAttempts = 8;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = random.nextString(HOUSEHOLD_CODE_LENGTH);
    if (await blocklist.isBlocked(code.toLowerCase())) continue;
    if (await isTaken(code)) continue;
    return code;
  }
  throw new AppError('CONFLICT', 'Could not generate a free household code');
}
