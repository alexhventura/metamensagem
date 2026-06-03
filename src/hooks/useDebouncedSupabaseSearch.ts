import { useEffect, useState } from 'react';
import { searchFrases, searchFrasesByText } from '../lib/frasesModel';
import { itemConteudoFromSearchHit } from '../lib/itemFromSearchHit';
import { isSupabaseConfigured } from '../lib/supabaseClient';
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
 * Busca textual no índice Supabase (debounce). Retorna null quando query vazia ou Supabase off.
 */
export function useDebouncedSupabaseSearch(query: string, options: Options = {}) {
  const { debounceMs = 300, limit = 48, filters } = options;
  const trimmed = query.trim();
  const [items, setItems] = useState<ItemConteudo[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trimmed) {
      setItems(null);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setItems(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    const timer = window.setTimeout(() => {
      const hasFilters = Boolean(filters?.categoriaSlug || filters?.tagSlugs?.length);
      const request = hasFilters
        ? searchFrases(trimmed, filters, { limit })
        : searchFrasesByText(trimmed, { limit });

      void request
        .then((hits) => {
          if (cancelled) return;
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
  }, [trimmed, debounceMs, limit, filters?.categoriaSlug, filters?.tagSlugs?.join('|')]);

  return {
    items,
    loading,
    active: Boolean(trimmed),
    enabled: isSupabaseConfigured(),
  };
}
