import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { searchFrases, searchFrasesByText } from '../lib/frasesModel';
import { itemConteudoFromSearchHit } from '../lib/itemFromSearchHit';
import { recordSearchLatency } from '../lib/observability/performanceMetrics';
import { recordSearchHitsForResults } from '../lib/analytics/fraseMetricsSync';
import { resolveUiLocale } from '../lib/uiLocale';
import type { ItemConteudo } from '../types/content';

export type SupabaseSearchFilters = {
  categoriaSlug?: string;
  tagSlugs?: string[];
};

type Options = {
  debounceMs?: number;
  limit?: number;
  filters?: SupabaseSearchFilters;
};

/**
 * Busca textual no índice CDN (debounce). Retorna null quando query vazia.
 */
export function useDebouncedSupabaseSearch(query: string, options: Options = {}) {
  const { debounceMs = 300, limit = 48, filters } = options;
  const { pathname } = useLocation();
  const locale = resolveUiLocale(pathname);
  const trimmed = query.trim();
  const [items, setItems] = useState<ItemConteudo[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trimmed) {
      setItems(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    const timer = window.setTimeout(() => {
      const hasFilters = Boolean(filters?.categoriaSlug || filters?.tagSlugs?.length);
      const request = hasFilters
        ? searchFrases(trimmed, filters, { limit, locale })
        : searchFrasesByText(trimmed, { limit, locale });
      const started = performance.now();

      void request
        .then((hits) => {
          if (cancelled) return;
          recordSearchLatency(performance.now() - started);
          recordSearchHitsForResults(hits);
          setItems(hits.map(itemConteudoFromSearchHit));
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, debounceMs, limit, locale, filters?.categoriaSlug, filters?.tagSlugs?.join('|')]);

  return {
    items,
    loading,
    active: Boolean(trimmed),
    enabled: true,
  };
}
