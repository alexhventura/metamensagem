import { useCallback, useEffect, useState } from 'react';
import {
  searchFrasesByCategoria,
  searchFrasesByTags,
  type FraseSearchHit,
} from '../lib/frasesModel';
import { itemConteudoFromSearchHit } from '../lib/itemFromSearchHit';
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

type KeysetCursor = { id: string; popularidade: number };

function cursorFromLastHit(hits: FraseSearchHit[]): KeysetCursor | null {
  const last = hits[hits.length - 1];
  if (!last?.id) return null;
  return { id: last.id, popularidade: last.popularidade ?? 0 };
}

export function useSupabaseTaxonomyList(slug: string | null) {
  const [items, setItems] = useState<ItemConteudo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [ready, setReady] = useState(false);
  const [cursor, setCursor] = useState<KeysetCursor | null>(null);

  const fetchPage = useCallback(
    async (slugKey: string, nextCursor: KeysetCursor | null, append: boolean) => {
      const asCategoria = MAIN_CATEGORIA_SLUGS.has(slugKey);
      const searchOpts = nextCursor
        ? {
            limit: PAGE_SIZE,
            afterId: nextCursor.id,
            afterPopularidade: nextCursor.popularidade,
          }
        : { limit: PAGE_SIZE };

      const hits = asCategoria
        ? await searchFrasesByCategoria(slugKey, searchOpts)
        : await searchFrasesByTags([slugKey], searchOpts);

      const mapped = hits.map(itemConteudoFromSearchHit);
      setItems((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMore(hits.length >= PAGE_SIZE);
      setCursor(cursorFromLastHit(hits));
      return mapped.length;
    },
    []
  );

  useEffect(() => {
    if (!slug) {
      setItems([]);
      setHasMore(false);
      setReady(true);
      setCursor(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setReady(false);
    setCursor(null);

    void fetchPage(slug, null, false)
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
    if (!slug || !hasMore || loading || !cursor) return;
    setLoading(true);
    try {
      await fetchPage(slug, cursor, true);
    } finally {
      setLoading(false);
    }
  }, [slug, hasMore, loading, cursor, fetchPage]);

  return {
    items,
    loading,
    hasMore,
    ready,
    enabled: true,
    loadMore,
  };
}
