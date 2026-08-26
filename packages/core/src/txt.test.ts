import { describe, expect, it } from 'vitest';
import { AppError } from './errors';
import type { HouseholdExport } from './txt';
import { EXPORT_SECTIONS, parseHouseholdExport, serializeHouseholdExport } from './txt';

const fixture = {
  households: [
    {
      id: 'h1',
      name: 'Bekele Family',
      code: 'BEKELE',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
      syncedAt: '2026-08-01T10:00:00.000Z',
      lastExportAt: '2026-08-20T10:00:00.000Z',
    },
  ],
  people: [
    { id: 'p1', householdId: 'h1', name: 'Hana', phone: '+251911000000' },
    { id: 'p2', householdId: 'h1', name: 'Sami' },
  ],
  users: [
    {
      id: 'u1',
      username: 'hana',
      passwordHash: '$argon2id$v=19$m=65540,t=3,p=4$secret',
      phone: '+251911000000',
      personId: 'p1',
      householdId: 'h1',
    },
  ],
  roles: [{ id: 'r1', householdId: 'h1', name: 'Mother', isOwnerRole: true }],
  occurrences: [
    {
      id: 'o1',
      ruleId: 'rule1',
      dueDate: '2026-08-25',
      status: 'completed',
      subtaskStates: {},
    },
  ],
} satisfies Partial<Record<(typeof EXPORT_SECTIONS)[number], unknown>>;

describe('txt portability format', () => {
  it('roundtrips serialize → parse to the sanitized snapshot (§11 item 1)', () => {
    const text = serializeHouseholdExport(fixture);
    const { version, data } = parseHouseholdExport(text);

    expect(version).toBe(1);
    // Every declared section normalizes to an array, even absent ones.
    for (const section of EXPORT_SECTIONS) expect(Array.isArray(data[section])).toBe(true);

    expect(data.households[0]).toEqual({
      id: 'h1',
      name: 'Bekele Family',
      code: 'BEKELE',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    });
    expect(data.users).toEqual([
      { id: 'u1', username: 'hana', personId: 'p1', householdId: 'h1' },
    ]);
    expect(data.people).toEqual([
      { id: 'p1', householdId: 'h1', name: 'Hana' },
      { id: 'p2', householdId: 'h1', name: 'Sami' },
    ]);
  });

  it('never carries identity material in the payload (D55 / CN §62)', () => {
    const text = serializeHouseholdExport(fixture);
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('$argon2');
    expect(text).not.toContain('+251911000000');
    expect(text).not.toContain('phone');
    expect(text).not.toContain('syncedAt');
    expect(text.startsWith('### CHORIFY-HOUSEHOLD v1\n')).toBe(true);
  });

  it('rejects newer majors with IMPORT_TOO_NEW', () => {
    const newer = `### CHORIFY-HOUSEHOLD v${99}\n{}\n`;
    try {
      parseHouseholdExport(newer);
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as AppError).code).toBe('IMPORT_TOO_NEW');
    }
  });

  it('parses older majors leniently, defaulting missing sections', () => {
    const older =
      '### CHORIFY-HOUSEHOLD v0\n' +
      JSON.stringify({ people: [{ id: 'p1' }], someFutureSection: [{ x: 1 }] });
    const { version, data } = parseHouseholdExport(older);

    expect(version).toBe(0);
    expect(data.people).toEqual([{ id: 'p1' }]);
    expect(data.households).toEqual([]);
  });

  it('throws VALIDATION_ERROR on bad header or broken payload', () => {
    expect(() => parseHouseholdExport('hello world')).toThrowError(AppError);
    expect(() => parseHouseholdExport('### CHORIFY-HOUSEHOLD v1\n{nope')).toThrowError(AppError);
    try {
      parseHouseholdExport('### CHORIFY-HOUSEHOLD v1\n"just a string"');
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as AppError).code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects non-array sections', () => {
    const text = '### CHORIFY-HOUSEHOLD v1\n' + JSON.stringify({ roles: 'nope' }) + '\n';
    expect(() => parseHouseholdExport(text)).toThrowError(/roles/);
  });

  it('serializes an empty export with all sections present', () => {
    const empty: HouseholdExport = Object.fromEntries(
      EXPORT_SECTIONS.map((section) => [section, []]),
    ) as unknown as HouseholdExport;
    const { data } = parseHouseholdExport(serializeHouseholdExport(empty));
    expect(Object.keys(data).sort()).toEqual([...EXPORT_SECTIONS].sort());
  });
});
