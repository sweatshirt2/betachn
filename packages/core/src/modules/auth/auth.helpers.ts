import type { RandomSource } from '../../ports';

export const USERNAME_PATTERN = /^[A-Za-z]{2,30}$/;
export const USERNAME_MIN = 2;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 6;

/** Tiny static denylist — kills the only realistic attack on a 6-char policy (D57). */
export const PASSWORD_DENYLIST = [
  '123456', '1234567', '12345678', '123456789', '1234567890', 'password', 'password1',
  'qwerty', 'qwerty123', 'abc123', '111111', '000000', '121212', '123321', '654321',
  'iloveyou', 'admin', 'welcome', 'monkey', 'dragon', 'sunshine', 'princess', 'football',
  'baseball', 'letmein', 'master', 'hello', 'freedom', 'whatever', 'qazwsx', 'trustno1',
] as const;

/** Returns the lowercase username when valid, else null. Amharic script → null (D53). */
export function normalizeUsername(input: string): string | null {
  const candidate = input.trim();
  if (!USERNAME_PATTERN.test(candidate)) return null;
  return candidate.toLowerCase();
}

const SYLLABLES = [
  'ba', 'be', 'bi', 'bo', 'bu', 'da', 'de', 'di', 'do', 'du', 'ka', 'ke', 'ki',
  'ko', 'ku', 'la', 'le', 'li', 'lo', 'lu', 'ma', 'me', 'mi', 'mo', 'mu', 'na',
  'ne', 'ni', 'no', 'nu', 'ra', 're', 'ri', 'ro', 'ru', 'sa', 'se', 'si', 'so',
  'su', 'ta', 'te', 'ti', 'to', 'tu',
] as const;

/** Pronounceable candidate of exactly `length` letters; default random 3–6 (D53). */
export function generateUsernameCandidate(random: RandomSource, length?: number): string {
  const target = length ?? 3 + random.nextInt(4); // 3..6
  let name = '';
  while (name.length < target) {
    name += SYLLABLES[random.nextInt(SYLLABLES.length)] ?? 'ma';
  }
  return name.slice(0, Math.min(Math.max(target, 3), 6));
}

/**
 * Basic E.164 normalization. With `defaultCountryCode` (e.g. '251'),
 * local trunk formats ('0911 …') are completed; without it they are
 * rejected — ambiguity is never guessed. Returns null when implausible.
 */
export function normalizePhoneE164(raw: string, defaultCountryCode?: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  const plusCount = (digits.match(/\+/g) ?? []).length;
  if (plusCount > 1 || (plusCount === 1 && !digits.startsWith('+'))) return null;

  const hasPlus = digits.startsWith('+');
  const body = digits.replaceAll('+', '');
  let normalized: string;
  if (hasPlus) {
    if (body.startsWith('0')) return null; // international form never carries a trunk 0
    normalized = body;
  } else if (defaultCountryCode !== undefined && body.startsWith('0')) {
    normalized = `${defaultCountryCode}${body.slice(1)}`;
  } else {
    return null; // ambiguous bare number
  }
  if (normalized.length < 7 || normalized.length > 15) return null;
  return `+${normalized}`;
}
