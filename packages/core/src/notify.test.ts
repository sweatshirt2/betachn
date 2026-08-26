import { describe, expect, it } from 'vitest';
import {
  categoryAllowed,
  filterByPrefs,
  KIND_CATEGORY,
  resolveRecipients,
  type PrefToggles,
} from './notify';

const HANA = 'p-hana';
const ABEBE = 'p-abebe';
const DANIEL = 'p-daniel';
const SARA = 'p-sara';

describe('notification recipient map (§4.10 / §11 item 1)', () => {
  it('assignment and digest go to assignees, deduped', () => {
    const ctx = { assigneePersonIds: [DANIEL, DANIEL, SARA] };
    expect(resolveRecipients('assignment', ctx)).toEqual([DANIEL, SARA]);
    expect(resolveRecipients('reminderDigest', ctx)).toEqual([DANIEL, SARA]);
  });

  it('completion and missed go to rule creator, else owners, minus actor', () => {
    expect(
      resolveRecipients('completion', {
        ruleCreatorPersonId: ABEBE,
        ownerPersonIds: [HANA],
        actorPersonId: DANIEL,
      }),
    ).toEqual([ABEBE]);

    // No creator → owners; actor holding ownership is removed.
    expect(
      resolveRecipients('missed', {
        ownerPersonIds: [HANA, SARA],
        actorPersonId: HANA,
      }),
    ).toEqual([SARA]);
  });

  it('creator==actor notifies nobody — first-write-wins history stays quiet', () => {
    expect(
      resolveRecipients('completion', {
        ruleCreatorPersonId: HANA,
        ownerPersonIds: [SARA],
        actorPersonId: HANA,
      }),
    ).toEqual([]);
  });

  it('backup goes to all owner holders; supply alerts to managers minus actor', () => {
    expect(resolveRecipients('backup', { ownerPersonIds: [HANA, SARA] })).toEqual([HANA, SARA]);
    expect(
      resolveRecipients('supplyAlert', {
        supplyManagerPersonIds: [HANA, ABEBE],
        actorPersonId: ABEBE,
      }),
    ).toEqual([HANA]);
  });

  it('maps kinds onto persisted categories (supply rides reminder)', () => {
    expect(KIND_CATEGORY.assignment).toBe('assignment');
    expect(KIND_CATEGORY.reminderDigest).toBe('reminder');
    expect(KIND_CATEGORY.supplyAlert).toBe('reminder');
    expect(KIND_CATEGORY.backup).toBe('backup');
  });
});

describe('prefs filtering', () => {
  it('absent row uses defaults: finance/bill OFF, rest ON', () => {
    for (const category of ['assignment', 'reminder', 'completion', 'missed', 'backup'] as const) {
      expect(categoryAllowed(category, null)).toBe(true);
    }
    expect(categoryAllowed('finance', undefined)).toBe(false);
    expect(categoryAllowed('bill', {})).toBe(false);
  });

  it('explicit toggles override defaults both ways', () => {
    expect(categoryAllowed('finance', { finance: true })).toBe(true);
    expect(categoryAllowed('reminder', { reminder: false })).toBe(false);
  });

  it('filters each recipient through their own row', () => {
    const prefsFor = (personId: string): PrefToggles | null =>
      personId === DANIEL ? { reminder: false } : personId === SARA ? null : {};

    const kept = filterByPrefs([HANA, DANIEL, SARA], 'reminderDigest', prefsFor);
    expect(kept).toEqual([HANA, SARA]); // Daniel muted reminders; absent row → default ON

    // Supply alerts ride the reminder toggle.
    expect(filterByPrefs([DANIEL, SARA], 'supplyAlert', prefsFor)).toEqual([SARA]);
  });
});
