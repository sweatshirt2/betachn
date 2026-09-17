import { AppError } from './errors';
import type { Row } from './db';

/**
 * TXT portability format (§4.11 / CN §§62–69): line-one header, then
 * pretty-printed JSON of all household-content tables. Identity material is
 * NOT household content (D55) — password hashes, sessions, OAuth identities,
 * verification/rate-limit bookkeeping and phone numbers never leave the
 * device/server through this format.
 */

export const TXT_VERSION = 1;
const HEADER_PATTERN = /^### CHORIFY-HOUSEHOLD v(\d+)$/;

/** Canonical section order — stable output keeps exported files diff-friendly. */
export const EXPORT_SECTIONS = [
  'households',
  'people',
  'users',
  'roles',
  'routines',
  'responsibilities',
  'subtasks',
  'assignment_rules',
  'occurrences',
  'rooms',
  'assets',
  'service_records',
  'supplies',
  'supply_events',
  'shopping_items',
  'recurring_shopping_items',
  'activity_events',
  'notifications',
  'notification_prefs',
] as const;

export type ExportSection = (typeof EXPORT_SECTIONS)[number];

export type HouseholdExport = { [S in ExportSection]: Row[] };

/** Volatile runtime state stripped from `households` rows on export. */
const HOUSEHOLD_DROP_KEYS = ['syncedAt', 'lastExportAt'] as const;
/** D55: contact/recovery material is excluded alongside credentials. */
const PEOPLE_DROP_KEYS = ['phone'] as const;
const USERS_DROP_KEYS = ['passwordHash', 'phone'] as const;

const DROP_BY_SECTION: Partial<Record<ExportSection, readonly string[]>> = {
  households: HOUSEHOLD_DROP_KEYS,
  people: PEOPLE_DROP_KEYS,
  users: USERS_DROP_KEYS,
};

function omitKeys(row: Row, dropKeys: readonly string[]): Row {
  const clean: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (!dropKeys.includes(key)) clean[key] = value;
  }
  return clean;
}

function normalizeExport(raw: Record<string, unknown>): HouseholdExport {
  const data = {} as HouseholdExport;
  for (const section of EXPORT_SECTIONS) {
    const value = raw[section];
    if (value === undefined || value === null) {
      data[section] = [];
      continue;
    }
    if (!Array.isArray(value) || value.some((row) => typeof row !== 'object' || row === null)) {
      throw new AppError('VALIDATION_ERROR', `Section ${section} must be an array of objects`);
    }
    data[section] = value as Row[];
  }
  return data;
}

/** Strips identity/volatile material and renders header + pretty JSON. */
export function serializeHouseholdExport(input: Partial<Record<ExportSection, Row[]>>): string {
  const normalized = normalizeExport(input);
  for (const [section, dropKeys] of Object.entries(DROP_BY_SECTION)) {
    normalized[section as ExportSection] = normalized[section as ExportSection].map((row) =>
      omitKeys(row, dropKeys),
    );
  }
  const header = `### CHORIFY-HOUSEHOLD v${TXT_VERSION}`;
  return `${header}\n${JSON.stringify(normalized, null, 2)}\n`;
}

/**
 * Validates header + shape (§4.11). Version above the current major is
 * rejected with IMPORT_TOO_NEW; older majors parse leniently (missing
 * sections become empty); unknown extra sections are ignored.
 */
export function parseHouseholdExport(text: string): { version: number; data: HouseholdExport } {
  const newlineIndex = text.indexOf('\n');
  const header = newlineIndex === -1 ? text : text.slice(0, newlineIndex);
  const match = HEADER_PATTERN.exec(header.trim());
  if (!match) {
    throw new AppError('VALIDATION_ERROR', 'Not a Chorify household file');
  }
  const version = Number(match[1]);
  if (version > TXT_VERSION) {
    throw new AppError('IMPORT_TOO_NEW', 'This household copy was made by a newer app version');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(newlineIndex + 1));
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Household copy payload is not valid JSON');
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new AppError('VALIDATION_ERROR', 'Household copy payload must be an object');
  }
  return { version, data: normalizeExport(raw as Record<string, unknown>) };
}
