import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_TYPES,
  activityDomain,
  buildActivity,
  DOMAIN_BY_TYPE,
} from './activity';

describe('activity event catalog (§4.10 / §6.13)', () => {
  it('binds every catalogued type to exactly one domain', () => {
    expect(Object.keys(DOMAIN_BY_TYPE).sort()).toEqual([...ACTIVITY_TYPES].sort());
    for (const type of ACTIVITY_TYPES) {
      expect(activityDomain(type)).toBeTruthy();
    }
  });

  it('gates the story feed by the locked domains', () => {
    expect(buildActivity('occurrence.completed', { title: 'Laundry' })).toEqual({
      type: 'occurrence.completed',
      payload: { title: 'Laundry' },
      domain: 'responsibilities',
    });
    expect(activityDomain('supply.low')).toBe('resources');
    expect(activityDomain('person.added')).toBe('household');
    expect(activityDomain('asset.serviced')).toBe('home');
    expect(activityDomain('household.exported')).toBe('household');
  });

  it('keeps supply restock out of the catalog — activity only entering low/out (§6.11)', () => {
    expect(ACTIVITY_TYPES.some((type) => type.startsWith('supply.re'))).toBe(false);
  });

  it('defaults params to an empty object', () => {
    expect(buildActivity('role.reset').payload).toEqual({});
  });
});
