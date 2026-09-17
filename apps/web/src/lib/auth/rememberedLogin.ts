/**
 * D101 step-down login persistence: the device remembers the last household
 * code and usernames per person across logout, so warm devices skip typing
 * entirely (code → face grid → maybe password). localStorage is deliberate —
 * these are conveniences, never credentials; the D63 passcode gate is the
 * thing that protects the device itself.
 */
const CODE_KEY = 'chorify-last-household-code';
const NAMES_KEY = 'chorify-last-names';

export function readLastHouseholdCode(): string | null {
  try {
    return localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

export function rememberHouseholdCode(code: string): void {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    // private mode — convenience only
  }
}

/** code → personId → username, for prefilling the password step. */
export function readRememberedNames(code: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    if (!raw) return {};
    return (JSON.parse(raw) as Record<string, Record<string, string>>)[code] ?? {};
  } catch {
    return {};
  }
}

export function rememberName(code: string, personId: string, username: string): void {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, string>>) : {};
    all[code] = { ...(all[code] ?? {}), [personId]: username };
    localStorage.setItem(NAMES_KEY, JSON.stringify(all));
  } catch {
    // private mode — convenience only
  }
}
