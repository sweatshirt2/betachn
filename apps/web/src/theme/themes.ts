export const THEME_IDS = ['family', 'ember', 'highland', 'glacier', 'honey', 'garden'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
  family: 'Family light',
  ember: 'Ember dark',
  highland: 'Highland contrast',
  glacier: 'Glacier blue',
  honey: 'Honey amber',
  garden: 'Garden green',
};

export const THEME_STORAGE_KEY = 'chorify-theme';

export function isThemeId(value: unknown): value is ThemeId {
  return value === 'family' || value === 'ember' || value === 'highland' || value === 'glacier' || value === 'honey' || value === 'garden';
}
