/**
 * Constantes da plataforma global — idioma-fonte e locales suportados.
 */

import { SEO_LOCALES, type SeoLocale } from './locales';

/** Conteúdo canônico sempre em português (armazenamento e tradução outbound). */
export const SOURCE_CONTENT_LOCALE: SeoLocale = 'pt';

export const SUPPORTED_LOCALES = SEO_LOCALES;

export type SupportedLocale = SeoLocale;

export function isSupportedLocale(value: string): value is SeoLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
