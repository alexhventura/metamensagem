import type { CardLang } from './types';
import { PAGE_TRANSLATE_LANGUAGES } from './pageLanguages';

export const CARD_LANG_OPTIONS: { code: CardLang; label: string }[] = [
  ...PAGE_TRANSLATE_LANGUAGES.map((l) => ({
    code: l.code,
    label: `${l.flag} ${l.native}`,
  })),
  { code: 'hi', label: '🇮🇳 हिन्दी' },
];

/** Nome do idioma para feedback “Traduzido para …”. */
export const CARD_LANG_SUCCESS_LABEL: Record<CardLang, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  hi: 'हिन्दी',
  nl: 'Nederlands',
  pl: 'Polski',
  zh: '中文',
};

export const ALL_CARD_LANGS: CardLang[] = CARD_LANG_OPTIONS.map((o) => o.code);

export function toMyMemoryLang(code: CardLang): string {
  if (code === 'pt') return 'pt-BR';
  if (code === 'zh') return 'zh-CN';
  return code;
}
