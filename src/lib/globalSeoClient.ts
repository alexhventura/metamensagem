/**
 * Carrega meta SEO i18n + hreflang por shard (sob demanda).
 */

import { shardForSlug } from '../../lib/utils/shardForSlug';
import type { FraseI18nSeoFields } from '../../lib/seo/i18nTemplates';
import type { SeoLocale } from '../../lib/i18n/locales';
import { isSeoLocale, SEO_LOCALES, seoLocaleFromLanguageOriginal } from '../../lib/i18n/locales';

const metaCache = new Map<string, Record<string, FraseI18nSeoFields>>();

export async function loadFraseI18nMeta(slug: string): Promise<FraseI18nSeoFields | null> {
  const key = slug.toLowerCase();
  const shard = shardForSlug(key);
  if (!metaCache.has(shard)) {
    try {
      const res = await fetch(`/frases-v2/i18n-meta/shard-${shard}.json`);
      if (res.ok) {
        metaCache.set(shard, (await res.json()) as Record<string, FraseI18nSeoFields>);
      } else {
        metaCache.set(shard, {});
      }
    } catch {
      metaCache.set(shard, {});
    }
  }
  return metaCache.get(shard)?.[key] ?? null;
}

export function availableLanguagesFromMeta(
  meta: FraseI18nSeoFields | null,
  languageOriginal?: string
): SeoLocale[] {
  if (meta?.availableLanguages?.length) {
    const fromMeta = meta.availableLanguages.filter(isSeoLocale);
    return [...new Set<SeoLocale>([...fromMeta, ...SEO_LOCALES])];
  }
  const orig = seoLocaleFromLanguageOriginal(languageOriginal);
  return [...new Set<SeoLocale>([orig, ...SEO_LOCALES])];
}
