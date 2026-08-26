/**
 * Runtime ports (DIP seams). Domain rules depend on these interfaces, never
 * on concrete infrastructure (argon2, crypto, DB) — adapters live at the
 * edges, fakes live in tests. Swap implementations without touching rules.
 */
export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  newId(): string;
}

/**
 * Uniform randomness abstraction. `nextString` yields uppercase A-Z;
 * `nextInt` is half-open [0, maxExclusive).
 */
export interface RandomSource {
  nextString(length: number): string;
  nextInt(maxExclusive: number): number;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

/** Membership test against the persisted household-code blocklist. */
export interface BlocklistChecker {
  isBlocked(word: string): boolean | Promise<boolean>;
}
