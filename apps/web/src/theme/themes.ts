export const THEME_IDS = ['sky', 'peach', 'caramel', 'mint', 'butter', 'rose'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = 'sky';

export const THEME_LABELS: Record<ThemeId, string> = {
  sky: 'Sky',
  peach: 'Peach',
  caramel: 'Caramel',
  mint: 'Mint',
  butter: 'Butter',
  rose: 'Rose',
};

export const THEME_STORAGE_KEY = 'chorify-theme';

/** Ids from previous builds that must resolve to the default instead. */
const LEGACY_THEME_IDS = new Set([
  'family',
  'ember',
  'highland',
  'glacier',
  'honey',
  'garden',
  'rose-legacy',
  'buna',
  'olive',
  'meskel',
]);

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/**
 * Normalizes any stored value to a valid theme id. Legacy ids (previous
 * builds) fall back to the current default so stale localStorage never
 * resolves to a missing token set.
 */
export function normalizeStoredTheme(value: unknown): ThemeId {
  if (isThemeId(value)) return value;
  return DEFAULT_THEME;
}

export function isLegacyThemeId(value: unknown): boolean {
  return typeof value === 'string' && LEGACY_THEME_IDS.has(value);
}
