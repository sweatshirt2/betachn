import { describe, expect, it } from 'vitest';
import { AppError } from '../../errors';
import { purchaseGuard, supplyActivityType } from './resources.rules';

describe('supply state-change activity gating (§6.11)', () => {
  it('emits only when ENTERING low or out', () => {
    expect(supplyActivityType('low')).toBe('supply.low');
    expect(supplyActivityType('out')).toBe('supply.out');
  });

  it('restocking to available emits nothing', () => {
    expect(supplyActivityType('available')).toBeNull();
  });
});

describe('purchase idempotency (§6.12)', () => {
  it('lets an open item be purchased', () => {
    expect(() => purchaseGuard({ purchasedAt: null })).not.toThrow();
  });

  it('rejects a second purchase with CONFLICT', () => {
    try {
      purchaseGuard({ purchasedAt: new Date('2026-08-26T08:30:00.000Z') });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('CONFLICT');
    }
  });
});
