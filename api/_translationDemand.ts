/** Merge de fila de tradução (bundle em api/). */

export type TranslationDemandQueue = Record<string, Partial<Record<string, number>>>;

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

export function mergeDemandSnapshots(
  base: TranslationDemandSnapshot,
  incoming: Partial<TranslationDemandSnapshot>
): TranslationDemandSnapshot {
  const merged: TranslationDemandQueue = { ...base.queue };
  for (const [phraseId, locales] of Object.entries(incoming.queue || {})) {
    if (!locales || typeof locales !== 'object') continue;
    if (!merged[phraseId]) merged[phraseId] = {};
    for (const [locale, count] of Object.entries(locales)) {
      const n = Number(count) || 0;
      if (!n) continue;
      merged[phraseId][locale] = (merged[phraseId][locale] ?? 0) + n;
    }
  }

  const meta: TranslationDemandMeta = { ...base.meta };
  for (const [id, row] of Object.entries(incoming.meta || {})) {
    if (!row) continue;
    const prev = meta[id] || {};
    meta[id] = {
      slug: row.slug || prev.slug,
      category: row.category || prev.category,
      lastAt: Math.max(row.lastAt ?? 0, prev.lastAt ?? 0) || Date.now(),
      countries: { ...prev.countries },
    };
    if (row.countries) {
      for (const [cc, c] of Object.entries(row.countries)) {
        meta[id].countries![cc] = (meta[id].countries![cc] ?? 0) + (Number(c) || 0);
      }
    }
  }

  return {
    queue: merged,
    meta,
    updatedAt: new Date().toISOString(),
  };
}
