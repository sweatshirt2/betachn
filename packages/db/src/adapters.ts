import { createHash, randomBytes } from 'node:crypto';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import type {
  BlocklistChecker,
  Clock,
  PasswordHasher,
  RandomSource,
  SecureTokens,
  TokenDigester,
} from '@chorify/core';
import type { Database } from './client';
import { blocklistWords } from './models';

/**
 * Node-side port adapters (D67 edges): the concrete argon2/crypto
 * implementations the web routes and worker jobs bind into core services.
 */

export const systemClock: Clock = { now: () => new Date() };

/** Sessions persist sha256 hex only; raw tokens never touch storage (§8). */
export const nodeTokenDigester: TokenDigester = {
  sha256: (value) => createHash('sha256').update(value, 'utf8').digest('hex'),
};

export const nodeSecureTokens: SecureTokens = {
  nextToken: (byteLength = 32) => randomBytes(byteLength).toString('base64url'),
};

export const argon2Hasher: PasswordHasher = {
  hash: (plain) => argon2Hash(plain),
  verify: (hash, plain) => argon2Verify(hash, plain),
};

/** Uppercase A-Z strings for household codes — rejection-sampled, no modulo bias. */
export const nodeRandomSource: RandomSource = {
  nextString(length) {
    const bytes = randomBytes(length);
    let out = '';
    for (const byte of bytes) out += String.fromCharCode(65 + (byte % 26));
    return out;
  },
  nextInt(maxExclusive) {
    if (maxExclusive <= 0 || !Number.isInteger(maxExclusive)) {
      throw new RangeError(`nextInt bound out of range: ${maxExclusive}`);
    }
    const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
    for (;;) {
      const value = randomBytes(4).readUInt32BE(0);
      if (value < limit) return value % maxExclusive;
    }
  },
};

/** Blocklist rows are stored lowercase; rules pass lowercase candidates (D52). */
export function pgBlocklistChecker(executor: Database): BlocklistChecker {
  return {
    async isBlocked(word) {
      const rows = await executor
        .select({ word: blocklistWords.word })
        .from(blocklistWords)
        .where(eq(blocklistWords.word, word.toLowerCase()))
        .limit(1);
      return rows.length > 0;
    },
  };
}
