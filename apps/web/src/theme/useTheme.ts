'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_THEME, THEME_STORAGE_KEY, isLegacyThemeId, normalizeStoredTheme, type ThemeId } from './themes';

/**
 * Applies a theme id to <html data-theme> and persists it. Old stored ids
 * (previous builds) resolve to the default via normalizeStoredTheme, and the
 * stored value is rewritten so the migration is sticky.
 */
function applyStoredTheme(): ThemeId {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode) — fall through to default.
  }
  const resolved = normalizeStoredTheme(stored);
  if (isLegacyThemeId(stored)) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, resolved);
    } catch {
      // Non-fatal: theme still applies for this session.
    }
  }
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    setThemeState(applyStoredTheme());
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: theme still applies for this session.
    }
  }, []);

  return { theme, setTheme };
}
