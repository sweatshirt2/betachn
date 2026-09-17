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

/** Cryptographically strong session-token material (base64url) — distinct
 * from RandomSource's A-Z alphabet, which exists for human-typable codes. */
export interface SecureTokens {
  nextToken(byteLength?: number): string;
}

/** Sessions persist ONLY the digest of the raw bearer token (§8). */
export interface TokenDigester {
  sha256(value: string): string;
}

/**
 * Binary object storage (§4A.2 / D104): proof-photo blobs. Keys are
 * household-scoped paths (`hh/{householdId}/proof/{occurrenceId}/{uuid}.jpg`);
 * bytes are already-compressed JPEGs from the client. Serving is ALWAYS
 * through the auth-checked API proxy route — never presigned URLs (CSP
 * stays 'self', §8).
 */
export interface StoragePort {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  remove(key: string): Promise<void>;
}
