import { describe, expect, it } from 'vitest';
import { householdPreviewResponseSchema, householdPreviewSchema } from './auth.schema';
import type { RandomSource } from '../../ports';
import {
  generateUsernameCandidate,
  normalizePhoneE164,
  normalizeUsername,
} from './auth.helpers';
import {
  accountCreationBlockers,
  passwordIssues,
  promotionBlockers,
} from './auth.rules';
import { linkGoogleSchema, loginSchema, registerOnlineSchema } from './auth.schema';

function countingRandom(): RandomSource {
  let n = 0;
  return {
    nextString: (length) => 'ABCDEFGHIJKLMNOP'.slice(n++ % 16).padEnd(length, 'Z'),
    nextInt: (max) => n++ % max,
  };
}

describe('username policy (D53)', () => {
  it('accepts English letters only, lowercases, trims', () => {
    expect(normalizeUsername('  Bekele ')).toBe('bekele');
    expect(normalizeUsername('ab')).toBe('ab'); // min 2
    expect(normalizeUsername('a'.repeat(30))).toBe('a'.repeat(30)); // max 30
  });

  it('rejects digits, empty, too-long and non-Latin scripts', () => {
    expect(normalizeUsername('bekele1')).toBeNull();
    expect(normalizeUsername('ብከለ')).toBeNull();
    expect(normalizeUsername('b')).toBeNull();
    expect(normalizeUsername('a'.repeat(31))).toBeNull();
    expect(normalizeUsername('  ')).toBeNull();
  });

  it('generates pronounceable 3–6 letter candidates', () => {
    const random = countingRandom();
    expect(generateUsernameCandidate(random, 3)).toMatch(/^[a-z]{3}$/);
    expect(generateUsernameCandidate(random, 6)).toMatch(/^[a-z]{6}$/);
    const defaulted = generateUsernameCandidate(random);
    expect(defaulted.length).toBeGreaterThanOrEqual(3);
    expect(defaulted.length).toBeLessThanOrEqual(6);
  });
});

describe('phone normalization', () => {
  const ET = '251';

  it('completes local Ethiopian trunk format with the default region', () => {
    expect(normalizePhoneE164('0911 234 567', ET)).toBe('+251911234567');
    expect(normalizePhoneE164('09-11234567', ET)).toBe('+251911234567');
  });

  it('accepts explicit international formats as-is', () => {
    expect(normalizePhoneE164('+251-911-234-567')).toBe('+251911234567');
  });

  it('rejects ambiguity instead of guessing', () => {
    expect(normalizePhoneE164('0911234567')).toBeNull(); // local format, no default region
    expect(normalizePhoneE164('251911234567')).toBeNull(); // bare, no plus, no trunk 0
  });

  it('rejects implausible input', () => {
    expect(normalizePhoneE164('12345', ET)).toBeNull();
    expect(normalizePhoneE164('phone', ET)).toBeNull();
  });
});

describe('R2 account creation & promotion rules (D54)', () => {
  it('owner-targeted accounts require a phone', () => {
    expect(
      accountCreationBlockers({ targetHoldsOwnerRole: true }, { hasPhone: false, hasVerifiedEmail: true }),
    ).toEqual(['OWNER_TARGET_REQUIRES_PHONE']);
    expect(
      accountCreationBlockers({ targetHoldsOwnerRole: true }, { hasPhone: true, hasVerifiedEmail: false }),
    ).toEqual([]);
  });

  it('non-owner targets need nothing beyond credentials', () => {
    expect(
      accountCreationBlockers({ targetHoldsOwnerRole: false }, { hasPhone: false, hasVerifiedEmail: false }),
    ).toEqual([]);
  });

  it('promotion needs phone OR verified email; contactless is blocked', () => {
    expect(promotionBlockers({ hasPhone: false, hasVerifiedEmail: false })).toEqual([
      'OWNER_PROMOTION_REQUIRES_CONTACT',
    ]);
    expect(promotionBlockers({ hasPhone: true, hasVerifiedEmail: false })).toEqual([]);
    expect(promotionBlockers({ hasPhone: false, hasVerifiedEmail: true })).toEqual([]);
  });
});

describe('password policy (D57)', () => {
  it('enforces minimum length', () => {
    expect(passwordIssues('abc12')).toContain('TOO_SHORT');
    expect(passwordIssues('abc123')).not.toContain('TOO_SHORT');
  });

  it('rejects denylisted commons case-insensitively', () => {
    expect(passwordIssues('password')).toContain('COMMON_PASSWORD');
    expect(passwordIssues('PASSWORD')).toContain('COMMON_PASSWORD');
    expect(passwordIssues('xk9$mVq2')).not.toContain('COMMON_PASSWORD');
  });
});

describe('wire contracts', () => {
  it('discriminates phone vs google signup', () => {
    const phone = registerOnlineSchema.parse({
      mode: 'phone',
      code: 'bekele',
      username: 'Hana',
      password: 'hana1234',
      phone: '+251911234567',
    });
    expect(phone.code).toBe('BEKELE'); // normalized

    const google = registerOnlineSchema.safeParse({
      mode: 'google',
      code: 'BEKELE',
      oauthCode: '4/0Axx',
      redirectUri: 'https://app.chorify.example/oauth/callback',
    });
    expect(google.success).toBe(true);

    expect(registerOnlineSchema.safeParse({ mode: 'google' }).success).toBe(false);
  });

  it('login requires the full trio and a well-formed code', () => {
    expect(loginSchema.safeParse({ code: 'BEKELE', username: 'hana', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ code: 'BEKELE', username: 'hana' }).success).toBe(false);
    expect(loginSchema.safeParse({ code: 'BE12ELE', username: 'hana', password: 'x' }).success).toBe(false);
  });

  it('linking google demands the current password (D50)', () => {
    expect(
      linkGoogleSchema.safeParse({ oauthCode: 'x', redirectUri: 'https://e.x/c', currentPassword: '' }).success,
    ).toBe(false);
    expect(
      linkGoogleSchema.safeParse({ oauthCode: 'x', redirectUri: 'https://e.x/c', currentPassword: 'pw1234' }).success,
    ).toBe(true);
  });

  it('household-preview takes a code and returns typed faces (D101)', () => {
    const parsed = householdPreviewSchema.parse({ code: 'bekele' });
    expect(parsed.code).toBe('BEKELE'); // normalized like login

    const response = householdPreviewResponseSchema.parse({
      householdId: '123e4567-e89b-12d3-a456-426614174000',
      householdName: 'Bekele Family',
      faces: [
        { personId: '123e4567-e89b-12d3-a456-426614174001', name: 'Hana', avatarEmoji: null, hasPassword: true },
        { personId: '123e4567-e89b-12d3-a456-426614174002', name: 'Sami', avatarEmoji: '🙂', hasPassword: false },
      ],
    });
    expect(response.faces).toHaveLength(2);
    expect(response.faces[0]!.hasPassword).toBe(true);

    // A face row missing hasPassword is invalid — the UI branches on it.
    expect(
      householdPreviewResponseSchema.safeParse({
        householdId: '123e4567-e89b-12d3-a456-426614174000',
        householdName: 'x',
        faces: [{ personId: '123e4567-e89b-12d3-a456-426614174001', name: 'Hana', avatarEmoji: null }],
      }).success,
    ).toBe(false);
  });
});
