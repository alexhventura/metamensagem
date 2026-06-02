import type { SeoLocale } from '../i18n/locales';

export type TranslationDemandQueue = Record<string, Partial<Record<SeoLocale, number>>>;

export type TranslationDemandMeta = Record<
  string,
  {
    slug?: string;
    category?: string;
    countries?: Record<string, number>;
    lastAt?: number;
  }
>;

export type TranslationDemandSnapshot = {
  queue: TranslationDemandQueue;
  meta: TranslationDemandMeta;
  updatedAt?: string;
};

export function mergeDemandQueues(
  base: TranslationDemandQueue,
  incoming: TranslationDemandQueue
): TranslationDemandQueue {
  const merged: TranslationDemandQueue = { ...base };
  for (const [phraseId, locales] of Object.entries(incoming)) {
    if (!locales || typeof locales !== 'object') continue;
    if (!merged[phraseId]) merged[phraseId] = {};
    for (const [locale, count] of Object.entries(locales)) {
      const n = Number(count) || 0;
      if (!n) continue;
      const loc = locale as SeoLocale;
      merged[phraseId][loc] = (merged[phraseId][loc] ?? 0) + n;
    }
  }
  return merged;
}

export function mergeDemandMeta(
  base: TranslationDemandMeta,
  incoming: TranslationDemandMeta
): TranslationDemandMeta {
  const merged: TranslationDemandMeta = { ...base };
  for (const [id, row] of Object.entries(incoming)) {
    if (!row) continue;
    const prev = merged[id] || {};
    merged[id] = {
      slug: row.slug || prev.slug,
      category: row.category || prev.category,
      lastAt: Math.max(row.lastAt ?? 0, prev.lastAt ?? 0) || Date.now(),
      countries: { ...prev.countries },
    };
    if (row.countries) {
      for (const [cc, c] of Object.entries(row.countries)) {
        merged[id].countries![cc] = (merged[id].countries![cc] ?? 0) + (Number(c) || 0);
      }
    }
  }
  return merged;
}

export function mergeDemandSnapshots(
  base: TranslationDemandSnapshot,
  incoming: Partial<TranslationDemandSnapshot>
): TranslationDemandSnapshot {
  return {
    queue: mergeDemandQueues(base.queue || {}, incoming.queue || {}),
    meta: mergeDemandMeta(base.meta || {}, incoming.meta || {}),
    updatedAt: new Date().toISOString(),
  };
}
