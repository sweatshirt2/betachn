/**
 * Device passcode (D63): gate-only hash for synced accounts; optional
 * AES-GCM at-rest encryption for OFFLINE-ONLY households, with the UI-bound
 * law that forgetting the passcode makes the data unrecoverable.
 * WebCrypto only — runs in the browser worker and Node 22 alike.
 */

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const GCM_IV_BYTES = 12;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveBits(passcode: string, salt: Uint8Array, bits: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passcode),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    bits,
  );
  return new Uint8Array(derived);
}

export interface PasscodeGate {
  /** base64url random salt. */
  salt: string;
  /** base64url PBKDF2-SHA256 digest of the passcode. */
  hash: string;
}

/** Creates the gate-only credential (synced accounts — D63). */
export async function createGate(passcode: string): Promise<PasscodeGate> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(passcode, salt, 256);
  return { salt: toBase64Url(salt), hash: toBase64Url(hash) };
}

/** Length-independent compare of the two digests. */
export async function verifyGate(
  passcode: string,
  gate: PasscodeGate,
): Promise<boolean> {
  const candidate = await deriveBits(passcode, fromBase64Url(gate.salt), 256);
  const expected = fromBase64Url(gate.hash);
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate[i]! ^ expected[i]!;
  return diff === 0;
}

/** AES-GCM key derived from the SAME PBKDF2 stretch, distinct output length. */
async function deriveAesGcmKey(passcode: string, saltB64u: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passcode),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromBase64Url(saltB64u) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedBlob {
  /** base64url AES-GCM IV (96 bits). */
  iv: string;
  /** base64url ciphertext. */
  ciphertext: string;
}

/** At-rest encryption hook for offline-only households (D63). */
export async function encryptJson(keySeed: { passcode: string; salt: string }, value: unknown): Promise<EncryptedBlob> {
  const key = await deriveAesGcmKey(keySeed.passcode, keySeed.salt);
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource,
  );
  return { iv: toBase64Url(iv), ciphertext: toBase64Url(new Uint8Array(ciphertext)) };
}

/** Throws when the passcode is wrong or the payload was tampered with. */
export async function decryptJson<T>(keySeed: { passcode: string; salt: string }, blob: EncryptedBlob): Promise<T> {
  const key = await deriveAesGcmKey(keySeed.passcode, keySeed.salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(blob.iv) as BufferSource },
    key,
    fromBase64Url(blob.ciphertext) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
