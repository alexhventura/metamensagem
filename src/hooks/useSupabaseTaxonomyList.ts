import { useCallback, useEffect, useState } from 'react';
import {
  searchFrasesByCategoria,
  searchFrasesByTags,
} from '../lib/frasesModel';
import { itemConteudoFromSearchHit } from '../lib/itemFromSearchHit';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import type { ItemConteudo } from '../types/content';

/** Slugs das categorias principais (schema categorias / categoriaPrincipal). */
export const MAIN_CATEGORIA_SLUGS = new Set([
  'amizade',
  'motivacao',
  'amor',
  'reflexao',
  'familia',
  'vida',
  'lideranca',
  'coragem',
  'inteligencia',
  'autoestima',
  'educacao',
  'sucesso',
  'felicidade',
  'humor',
  'sabedoria',
  'tempo',
  'fe',
  'negocios',
  'saude-mental',
  'gratidao',
  'desenvolvimento-pessoal',
  'espiritualidade',
  'trabalho',
  'superacao',
  'empreendedorismo',
]);

const PAGE_SIZE = 48;

export function useSupabaseTaxonomyList(slug: string | null) {
  const [items, setItems] = useState<ItemConteudo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [ready, setReady] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchPage = useCallback(
    async (slugKey: string, nextOffset: number, append: boolean) => {
      const asCategoria = MAIN_CATEGORIA_SLUGS.has(slugKey);
      const hits = asCategoria
        ? await searchFrasesByCategoria(slugKey, { limit: PAGE_SIZE, offset: nextOffset })
        : await searchFrasesByTags([slugKey], { limit: PAGE_SIZE, offset: nextOffset });

      const mapped = hits.map(itemConteudoFromSearchHit);
      setItems((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMore(hits.length >= PAGE_SIZE);
      setOffset(nextOffset + hits.length);
      return mapped.length;
    },
    []
  );

  useEffect(() => {
    if (!slug || !isSupabaseConfigured()) {
      setItems([]);
      setHasMore(false);
      setReady(true);
      setOffset(0);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setReady(false);
    setOffset(0);

    void fetchPage(slug, 0, false)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setHasMore(false);
          setReady(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!slug || !hasMore || loading) return;
    setLoading(true);
    try {
      await fetchPage(slug, offset, true);
    } finally {
      setLoading(false);
    }
  }, [slug, hasMore, loading, offset, fetchPage]);

  return {
    items,
    loading,
    hasMore,
    ready,
    enabled: isSupabaseConfigured(),
    loadMore,
  };
}
