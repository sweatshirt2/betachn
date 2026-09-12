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

/**
 * Representative swatch colors per theme (kept in sync with styles/tokens.css)
 * so pickers can render true previews without mounting the theme. Each entry:
 * page gradient endpoints, primary, and one crayon accent.
 */
export const THEME_SWATCHES: Record<ThemeId, { from: string; to: string; primary: string; crayon: string }> = {
  sky: { from: '#f4f7fb', to: '#eaf2f9', primary: '#7fb5d8', crayon: '#a9cede' },
  peach: { from: '#fdf5f0', to: '#f8e9de', primary: '#e2a184', crayon: '#f2d8c8' },
  caramel: { from: '#faf4ea', to: '#f2e4cd', primary: '#c89a68', crayon: '#f5e3d2' },
  mint: { from: '#f2f8f3', to: '#e5f1e7', primary: '#8fbc9f', crayon: '#dce9dd' },
  butter: { from: '#fdf9ee', to: '#f8eed3', primary: '#dfb878', crayon: '#f7e8c3' },
  rose: { from: '#fbf3f3', to: '#f5e5e6', primary: '#d294a2', crayon: '#f4d7dc' },
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
