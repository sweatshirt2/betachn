'use client';

import { useCallback, useEffect, useState } from 'react';
import { THEME_STORAGE_KEY, isThemeId, type ThemeId } from './themes';

const DEFAULT_THEME: ThemeId = 'family';

function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {
    // Storage unavailable (private mode) — fall through to default.
  }
  return DEFAULT_THEME;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    document.documentElement.dataset.theme = stored;
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
