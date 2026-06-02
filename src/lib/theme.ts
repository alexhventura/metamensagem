export type Theme = 'light' | 'dark';

/** Chave pedida no CMS; cookie `mm_theme` é fallback se localStorage falhar. */
export const THEME_STORAGE_KEY = 'theme';
const THEME_COOKIE_KEY = 'mm_theme';

function normalizeThemeValue(raw: string | null): Theme | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'light' || v === 'claro') return 'light';
  if (v === 'dark' || v === 'escuro') return 'dark';
  return null;
}

function readThemeCookie(): Theme | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)mm_theme=(light|dark)\b/);
  return match ? (match[1] as Theme) : null;
}

function writeThemeCookie(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${THEME_COOKIE_KEY}=${theme};path=/;max-age=31536000;SameSite=Lax${secure}`;
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromLs = normalizeThemeValue(localStorage.getItem(THEME_STORAGE_KEY));
    if (fromLs) return fromLs;
  } catch {
    /* quota / bloqueio */
  }
  return readThemeCookie();
}

/** Tema efetivo: localStorage → cookie → data-theme → sistema. */
export function resolveTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;

  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
  }

  return getSystemTheme();
}

function applyThemeCssVars(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'light') {
    root.style.setProperty('--mm-bg', '#F8F9FA');
    root.style.setProperty('--mm-fg', '#18181b');
    root.style.setProperty('--mm-header-bg', 'rgba(255,255,255,0.8)');
    root.style.setProperty('--mm-header-border', '#e4e4e7');
    root.style.setProperty('--mm-subheader-bg', 'rgba(250,245,255,0.8)');
  } else {
    root.style.setProperty('--mm-bg', '#000000');
    root.style.setProperty('--mm-fg', '#ffffff');
    root.style.setProperty('--mm-header-bg', 'rgba(0,0,0,0.8)');
    root.style.setProperty('--mm-header-border', '#18181b');
    root.style.setProperty('--mm-subheader-bg', 'rgba(5,5,5,0.9)');
  }
}

export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    applyThemeCssVars(theme);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* quota */
  }
  writeThemeCookie(theme);
}

/** Antes do React: aplica tema salvo ou preferência do sistema (sem gravar sistema no storage). */
export function initThemeOnLoad(): Theme {
  const stored = getStoredTheme();
  const theme = stored ?? getSystemTheme();
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    applyThemeCssVars(theme);
  }
  if (stored) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, stored);
    } catch {
      /* ignore */
    }
    writeThemeCookie(stored);
  }
  return theme;
}
