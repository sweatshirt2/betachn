import { describe, expect, it } from 'vitest';
import { nextMaintenanceDue } from './home.rules';

describe('nextMaintenanceDue (home §6)', () => {
  it('adds the interval to the last service date across month boundaries', () => {
    expect(
      nextMaintenanceDue({ maintenanceIntervalDays: 30 }, '2026-01-15', '2026-02-01'),
    ).toBe('2026-02-14');
    expect(
      nextMaintenanceDue({ maintenanceIntervalDays: 7 }, '2026-02-27', '2026-03-01'),
    ).toBe('2026-03-06');
    // Year boundary.
    expect(
      nextMaintenanceDue({ maintenanceIntervalDays: 10 }, '2026-12-28', '2027-01-01'),
    ).toBe('2027-01-07');
  });

  it('returns null for assets without a maintenance interval', () => {
    expect(nextMaintenanceDue({ maintenanceIntervalDays: null }, '2026-08-26', '2026-08-26')).toBeNull();
    expect(nextMaintenanceDue({ maintenanceIntervalDays: undefined }, '2026-08-26', '2026-08-26')).toBeNull();
  });

  it('returns null when the asset has never been serviced', () => {
    expect(
      nextMaintenanceDue({ maintenanceIntervalDays: 90 }, null, '2026-08-26'),
    ).toBeNull();
  });
});
