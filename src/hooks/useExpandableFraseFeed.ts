import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sampleShuffled } from '../lib/catalogLimits';
import { loadFeedSample, type FeedSampleRow } from '../lib/staticFraseIndex';
import type { ItemConteudo } from '../types/content';

export function feedSampleToItem(row: FeedSampleRow): ItemConteudo {
  return {
    id: row.id,
    tipo: row.tipo === 'metafora' ? 'metafora' : 'frase',
    texto: row.texto,
    autor: row.autor || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    slug: row.slug,
  };
}

/**
 * Começa pelo lote leve da home e, em idle / ao aproximar do fim,
 * incorpora o feed-sample (~4k frases completas) para scroll contínuo.
 */
export function useExpandableFraseFeed(seed: ItemConteudo[], enabled: boolean) {
  const [extra, setExtra] = useState<ItemConteudo[]>([]);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const items = useMemo(() => {
    if (!extra.length) return seed;
    const seen = new Set(seed.map((item) => item.id));
    const appended: ItemConteudo[] = [];
    for (const item of extra) {
      if (item.tipo !== 'frase' || !item.texto || seen.has(item.id)) continue;
      seen.add(item.id);
      appended.push(item);
    }
    return appended.length ? [...seed, ...appended] : seed;
  }, [seed, extra]);

  const loadSample = useCallback(async () => {
    if (!enabled || sampleLoaded || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const rows = await loadFeedSample();
      const frases = rows
        .map(feedSampleToItem)
        .filter((item) => item.tipo === 'frase' && item.texto.trim());
      setExtra(sampleShuffled(frases, frases.length));
      setSampleLoaded(true);
    } catch (err) {
      console.warn('feed-sample:', err);
      setSampleLoaded(true);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [enabled, sampleLoaded]);

  useEffect(() => {
    if (!enabled || sampleLoaded) return;
    const run = () => {
      void loadSample();
    };
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(run, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const timer = window.setTimeout(run, 600);
    return () => window.clearTimeout(timer);
  }, [enabled, sampleLoaded, loadSample]);

  return { items, loadingMore, sampleLoaded, loadSample };
}
