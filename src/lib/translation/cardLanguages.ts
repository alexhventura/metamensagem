import type { CardLang } from './types';

export const CARD_LANG_OPTIONS: { code: CardLang; label: string }[] = [
  { code: 'pt', label: '🇧🇷 Português' },
  { code: 'en', label: '🇺🇸 English' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'ja', label: '🇯🇵 日本語' },
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
};

export const ALL_CARD_LANGS: CardLang[] = CARD_LANG_OPTIONS.map((o) => o.code);

export function toMyMemoryLang(code: CardLang): string {
  if (code === 'pt') return 'pt-BR';
  return code;
}
