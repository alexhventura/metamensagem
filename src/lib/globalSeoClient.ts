/**
 * Carrega meta SEO i18n + hreflang por shard (sob demanda).
 */

import { shardForSlug } from '../../lib/utils/shardForSlug';
import type { FraseI18nSeoFields } from '../../lib/seo/i18nTemplates';
import type { SeoLocale } from '../../lib/i18n/locales';
import { isSeoLocale, SEO_LOCALES, seoLocaleFromLanguageOriginal } from '../../lib/i18n/locales';
import { slugifyFraseTexto } from './slug';

const metaCache = new Map<string, Record<string, FraseI18nSeoFields>>();

function metaShardsToProbe(requested: string): string[] {
  const key = requested.toLowerCase().trim();
  const ids = new Set<string>([shardForSlug(key)]);
  const pseudo = slugifyFraseTexto(key.replace(/-/g, ' '));
  ids.add(shardForSlug(pseudo));
  if (key.length > 80) ids.add(shardForSlug(key.slice(0, 80)));
  return [...ids];
}

async function ensureMetaShard(shard: string): Promise<Record<string, FraseI18nSeoFields>> {
  if (metaCache.has(shard)) return metaCache.get(shard)!;
  try {
    const res = await fetch(`/frases-v2/i18n-meta/shard-${shard}.json`);
    if (res.ok) {
      const data = (await res.json()) as Record<string, FraseI18nSeoFields>;
      metaCache.set(shard, data);
      return data;
    }
    metaCache.set(shard, {});
  } catch {
    metaCache.set(shard, {});
  }
  return {};
}

export async function loadFraseI18nMeta(slug: string): Promise<FraseI18nSeoFields | null> {
  const key = slug.toLowerCase().trim();
  if (!key) return null;

  const lookupKeys = [key];
  const pseudo = slugifyFraseTexto(key.replace(/-/g, ' '));
  if (pseudo !== key) lookupKeys.push(pseudo);

  for (const shard of metaShardsToProbe(key)) {
    const map = await ensureMetaShard(shard);
    for (const lookupKey of lookupKeys) {
      const hit = map[lookupKey];
      if (hit) return hit;
    }
  }
  return null;
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
