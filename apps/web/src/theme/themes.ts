export const THEME_IDS = ['family', 'ember', 'highland', 'glacier', 'honey', 'garden', 'rose', 'buna', 'olive', 'meskel'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
  family: 'Family light',
  ember: 'Ember dark',
  highland: 'Highland contrast',
  glacier: 'Glacier blue',
  honey: 'Honey amber',
  garden: 'Garden green',
  rose: 'Gentle rose',
  buna: 'Buna coffee',
  olive: 'Olive grove',
  meskel: 'Meskel gold',
};

export const THEME_STORAGE_KEY = 'chorify-theme';

export function isThemeId(value: unknown): value is ThemeId {
  return value === 'family' || value === 'ember' || value === 'highland' || value === 'glacier' || value === 'honey' || value === 'garden' || value === 'rose' || value === 'buna' || value === 'olive' || value === 'meskel';
}
