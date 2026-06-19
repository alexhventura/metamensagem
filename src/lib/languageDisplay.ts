import type { SeoLocale } from '../../lib/i18n/locales';

const LANGUAGE_LABEL_PT: Record<SeoLocale, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  hi: 'हिन्दी',
};

export function languageOriginalLabel(locale: SeoLocale): string {
  return LANGUAGE_LABEL_PT[locale] ?? locale.toUpperCase();
}
