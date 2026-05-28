import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from '../lib/theme';

type ThemeContextValue = {
  tema: Theme;
  setTheme: (theme: Theme) => void;
  toggleTema: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTemaState] = useState<Theme>(() => resolveTheme());

  const setTheme = useCallback((theme: Theme) => {
    applyTheme(theme);
    setTemaState(theme);
  }, []);

  const toggleTema = useCallback(() => {
    setTheme(tema === 'light' ? 'dark' : 'light');
  }, [tema, setTheme]);

  useLayoutEffect(() => {
    const stored = getStoredTheme() ?? resolveTheme();
    applyTheme(stored);
    setTemaState(stored);
  }, []);

  useLayoutEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      if (e.newValue === 'light' || e.newValue === 'dark') {
        document.documentElement.setAttribute('data-theme', e.newValue);
        setTemaState(e.newValue);
      }
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      const current = resolveTheme();
      applyTheme(current);
      setTemaState(current);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  const value = useMemo(
    () => ({ tema, setTheme, toggleTema }),
    [tema, setTheme, toggleTema]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return ctx;
}
