import type { CardLang } from './types';

export type PageLanguageOption = {
  code: CardLang;
  flag: string;
  native: string;
  label: string;
};

/** Idiomas exibidos no modal premium (ordem de relevância). */
export const PAGE_TRANSLATE_LANGUAGES: PageLanguageOption[] = [
  { code: 'pt', flag: '🇧🇷', native: 'Português', label: 'Português' },
  { code: 'en', flag: '🇺🇸', native: 'English', label: 'English' },
  { code: 'es', flag: '🇪🇸', native: 'Español', label: 'Español' },
  { code: 'it', flag: '🇮🇹', native: 'Italiano', label: 'Italiano' },
  { code: 'fr', flag: '🇫🇷', native: 'Français', label: 'Français' },
  { code: 'de', flag: '🇩🇪', native: 'Deutsch', label: 'Deutsch' },
  { code: 'nl', flag: '🇳🇱', native: 'Nederlands', label: 'Nederlands' },
  { code: 'ja', flag: '🇯🇵', native: '日本語', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', native: '中文', label: '中文' },
];

export function pageLanguageByCode(code: CardLang): PageLanguageOption | undefined {
  return PAGE_TRANSLATE_LANGUAGES.find((l) => l.code === code);
}

export function pageLanguageNativeName(code: CardLang): string {
  return pageLanguageByCode(code)?.native ?? code.toUpperCase();
}
