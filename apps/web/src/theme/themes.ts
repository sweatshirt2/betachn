export const THEME_IDS = ['family', 'ember', 'highland'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
  family: 'Family light',
  ember: 'Ember dark',
  highland: 'Highland contrast',
};

export const THEME_STORAGE_KEY = 'chorify-theme';

export function isThemeId(value: unknown): value is ThemeId {
  return value === 'family' || value === 'ember' || value === 'highland';
}
