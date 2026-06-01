/**
 * Rotas com prefixo de idioma — URL sem prefixo = x-default (idioma original da frase).
 */

import {
  HREFLANG_MAP,
  SEO_LOCALES,
  type SeoLocale,
  isSeoLocale,
  seoLocaleFromLanguageOriginal,
} from '../../lib/i18n/locales';
import { absoluteUrl } from './seo';

export {
  SEO_LOCALES,
  PREFIX_LOCALES,
  type SeoLocale,
  seoLocaleFromLanguageOriginal,
  htmlLangAttribute,
} from '../../lib/i18n/locales';

/**
 * Caminho relativo da frase.
 * O idioma original (defaultLocale) usa /frases/:slug sem prefixo (x-default).
 */
export function frasePath(
  slug: string,
  locale: SeoLocale,
  defaultLocale: SeoLocale
): string {
  const s = slug.toLowerCase();
  if (locale === defaultLocale) return `/frases/${s}`;
  return `/${locale}/frases/${s}`;
}

export function fraseCanonicalUrl(
  slug: string,
  locale: SeoLocale,
  defaultLocale: SeoLocale
): string {
  return absoluteUrl(frasePath(slug, locale, defaultLocale));
}

/** URL x-default (sem prefixo) para o slug. */
export function fraseXDefaultUrl(slug: string, defaultLocale: SeoLocale): string {
  return fraseCanonicalUrl(slug, defaultLocale, defaultLocale);
}

/** Alternates hreflang → URL absoluta. x-default = URL sem prefixo. */
export function fraseHreflangAlternates(
  slug: string,
  defaultLocale: SeoLocale,
  available: SeoLocale[] = [...SEO_LOCALES]
): { hreflang: string; href: string }[] {
  const set = new Set<SeoLocale>(available);
  set.add(defaultLocale);
  const links: { hreflang: string; href: string }[] = [];
  for (const loc of SEO_LOCALES) {
    if (!set.has(loc)) continue;
    links.push({
      hreflang: HREFLANG_MAP[loc],
      href: fraseCanonicalUrl(slug, loc, defaultLocale),
    });
  }
  links.push({
    hreflang: 'x-default',
    href: fraseXDefaultUrl(slug, defaultLocale),
  });
  return links;
}

export function parseFraseRoute(pathname: string): {
  slug: string;
  prefixLocale: SeoLocale | null;
} | null {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length === 2 && parts[0] === 'frases') {
    return { slug: parts[1], prefixLocale: null };
  }
  if (parts.length === 3 && parts[1] === 'frases' && isSeoLocale(parts[0])) {
    return { slug: parts[2], prefixLocale: parts[0] };
  }
  return null;
}

/** Locale do conteúdo: prefixo na URL ou idioma original da frase. */
export function resolveFraseContentLocale(
  prefixLocale: SeoLocale | null,
  defaultLocale: SeoLocale
): SeoLocale {
  return prefixLocale ?? defaultLocale;
}

export function resolveFraseLocale(
  langParam: string | undefined,
  pathname: string,
  defaultLocale: SeoLocale = 'en'
): SeoLocale {
  const parsed = parseFraseRoute(pathname);
  if (parsed) {
    return resolveFraseContentLocale(parsed.prefixLocale, defaultLocale);
  }
  if (langParam && isSeoLocale(langParam)) return langParam;
  return defaultLocale;
}
