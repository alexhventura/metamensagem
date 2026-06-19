import type { CardLang } from './types';
import { PAGE_TRANSLATE_LANGUAGES } from './pageLanguages';
import { pageLanguageNativeName } from './pageLanguages';

const STORAGE_KEY = 'mm-page-translate-pref';

const SUPPORTED = new Set<CardLang>(PAGE_TRANSLATE_LANGUAGES.map((l) => l.code));

export function readPageTranslatePref(): CardLang | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const base = raw.toLowerCase().split('-')[0] as CardLang;
  return SUPPORTED.has(base) ? base : null;
}

export function persistPageTranslatePref(locale: CardLang | null): void {
  if (typeof localStorage === 'undefined') return;
  if (!locale) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, locale);
}

/** Idioma preferido do navegador, limitado aos idiomas do modal. */
export function browserPreferredPageLang(): CardLang | null {
  if (typeof navigator === 'undefined') return null;
  const candidates = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean) as string[];
  for (const raw of candidates) {
    const base = raw.toLowerCase().split('-')[0] as CardLang;
    if (SUPPORTED.has(base)) return base;
    if (base === 'zh') return 'zh';
  }
  return null;
}

/** Prioridade: localStorage → navegador → pt (idioma principal do acervo). */
export function resolvePageLocale(): CardLang {
  return readPageTranslatePref() ?? browserPreferredPageLang() ?? 'pt';
}

export { STORAGE_KEY, SUPPORTED as PAGE_LOCALE_SUPPORTED };
