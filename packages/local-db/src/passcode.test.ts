import { describe, expect, it } from 'vitest';
import {
  createGate,
  decryptJson,
  encryptJson,
  verifyGate,
} from './passcode';

describe('passcode gate (D63)', () => {
  it('verifies the correct passcode and rejects wrong ones', async () => {
    const gate = await createGate('hana1234');
    expect(await verifyGate('hana1234', gate)).toBe(true);
    expect(await verifyGate('hana12345', gate)).toBe(false);
    expect(await verifyGate('', gate)).toBe(false);
  });

  it('salts every gate uniquely', async () => {
    const a = await createGate('same-passcode');
    const b = await createGate('same-passcode');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('AES-GCM at-rest hooks (offline-only households)', () => {
  const seed = { passcode: 'device-key-123', salt: 'MDEyMzQ1Njc4OWFiY2RlZg' };

  it('roundtrips structured payloads', async () => {
    const household = { name: 'Bekele Family', people: [{ id: 'p1', name: 'Hana' }] };
    const blob = await encryptJson(seed, household);
    expect(blob.ciphertext).not.toContain('Bekele');
    const restored = await decryptJson<typeof household>(seed, blob);
    expect(restored).toEqual(household);
  });

  it('rejects the wrong passcode and tampered ciphertexts', async () => {
    const blob = await encryptJson(seed, { secret: 'birr amounts' });
    await expect(decryptJson({ passcode: 'wrong', salt: seed.salt }, blob)).rejects.toThrowError();

    const flipped = { ...blob, ciphertext: flipLastChar(blob.ciphertext) };
    await expect(decryptJson(seed, flipped)).rejects.toThrowError();
  });
});

function flipLastChar(value: string): string {
  const last = value.at(-1)!;
  return value.slice(0, -1) + (last === 'A' ? 'B' : 'A');
}
