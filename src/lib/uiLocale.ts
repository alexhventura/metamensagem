import { isSeoLocale, type SeoLocale } from '../../lib/i18n/locales';

export const UI_LOCALES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

const LANG_STORAGE_KEY = 'lang';

/** Prefixo de URL para UI (ex.: /en/frases/...). PT na raiz não usa prefixo. */
export function uiLocaleFromPathname(pathname: string): UiLocale | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (!seg || !isSeoLocale(seg) || seg === 'pt') return null;
  return seg;
}

function normalizeNavigatorLocale(): string {
  if (typeof navigator === 'undefined') return '';
  const raw = navigator.language || (navigator.languages?.[0] ?? '');
  return raw.toLowerCase().split('-')[0];
}

export function matchSupportedUiLocale(code: string | null | undefined): UiLocale | null {
  if (!code) return null;
  const base = code.toLowerCase().split('-')[0];
  return (UI_LOCALES as readonly string[]).includes(base) ? (base as UiLocale) : null;
}

/** Prioridade: URL → localStorage.lang → navegador → en. */
export function resolveUiLocale(pathname: string = '/'): UiLocale {
  const fromPath = uiLocaleFromPathname(pathname);
  if (fromPath) return fromPath;

  if (typeof localStorage !== 'undefined') {
    const stored = matchSupportedUiLocale(localStorage.getItem(LANG_STORAGE_KEY));
    if (stored) return stored;
  }

  const fromNav = matchSupportedUiLocale(normalizeNavigatorLocale());
  if (fromNav) return fromNav;

  return 'en';
}

export function persistUiLocale(locale: UiLocale): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LANG_STORAGE_KEY, locale);
}
