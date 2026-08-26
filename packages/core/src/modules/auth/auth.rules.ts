import { PASSWORD_DENYLIST, PASSWORD_MIN } from './auth.helpers';

export type SignupMode = 'google' | 'phone';

export interface AccountCreationTarget {
  /** Will the new account's person hold an owner-role? (R2 subject) */
  targetHoldsOwnerRole: boolean;
}

export interface ContactPresence {
  hasPhone: boolean;
  /** Google-verified email counts as contact (D50). */
  hasVerifiedEmail: boolean;
}

/**
 * R2 (D54): an account created FOR an owner-role holder requires a phone
 * number. Non-owner targets need nothing beyond credentials. The initial
 * creator is exempt — callers simply never route creators through here.
 */
export function accountCreationBlockers(
  target: AccountCreationTarget,
  contact: ContactPresence,
): string[] {
  const blockers: string[] = [];
  if (target.targetHoldsOwnerRole && !contact.hasPhone) {
    blockers.push('OWNER_TARGET_REQUIRES_PHONE');
  }
  return blockers;
}

/**
 * Promotion to an owner role requires a recovery-capable contact (D54/D56).
 * Google-verified email or phone both qualify.
 */
export function promotionBlockers(contact: ContactPresence): string[] {
  if (!contact.hasPhone && !contact.hasVerifiedEmail) {
    return ['OWNER_PROMOTION_REQUIRES_CONTACT'];
  }
  return [];
}

/** Password policy (D57): ≥6 chars, length-only + static denylist. */
export function passwordIssues(plain: string): string[] {
  const issues: string[] = [];
  if (plain.length < PASSWORD_MIN) issues.push('TOO_SHORT');
  if (PASSWORD_DENYLIST.includes(plain.toLowerCase() as (typeof PASSWORD_DENYLIST)[number])) {
    issues.push('COMMON_PASSWORD');
  }
  return issues;
}
