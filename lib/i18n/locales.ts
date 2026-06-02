/** Locales SEO (Fase 6) — prefixos de URL e hreflang. */

export const SEO_LOCALES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

/** Idiomas com prefixo na URL (opção B). PT usa /frases/:slug sem prefixo. */
export const PREFIX_LOCALES: SeoLocale[] = ['en', 'es', 'fr', 'de', 'it', 'ja', 'hi'];

export const HREFLANG_MAP: Record<SeoLocale, string> = {
  pt: 'pt-BR',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'ja',
  hi: 'hi',
};

export const COUNTRY_PRIORITY = ['US', 'BR', 'ES', 'FR', 'DE', 'IT', 'JP', 'IN'] as const;

export function isSeoLocale(value: string): value is SeoLocale {
  return (SEO_LOCALES as readonly string[]).includes(value);
}

export function localeFromPathPrefix(segment: string | undefined): SeoLocale | null {
  if (!segment) return null;
  return isSeoLocale(segment) ? segment : null;
}

/** Idioma original da frase (shard) → locale SEO; fallback PT (idioma-fonte da plataforma). */
export function seoLocaleFromLanguageOriginal(value: string | undefined | null): SeoLocale {
  if (value && isSeoLocale(value)) return value;
  return 'pt';
}

/** Valor BCP 47 para `<html lang>` e meta. */
export function htmlLangAttribute(locale: SeoLocale): string {
  return HREFLANG_MAP[locale];
}
