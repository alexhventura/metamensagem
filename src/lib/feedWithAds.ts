/** Grade 3 colunas: anúncio após cada 6 cards; blocos de 12 reiniciam o ciclo de ads. */

export const FEED_CARDS_PER_AD_BREAK = 6;
/** Uma “página” do feed: 2 linhas × 3 colunas × 2 blocos = 12 cards + 2 anúncios. */
export const FEED_PAGE_SIZE = 12;
export const FEED_INITIAL_VISIBLE = FEED_PAGE_SIZE;
export const FEED_LOAD_MORE_STEP = FEED_PAGE_SIZE;

export type FeedRow<T> =
  | { tipoItem: 'conteudo'; content: T }
  | { tipoItem: 'anuncio'; id: string };

/** Insere anúncio após cada 6 cards dentro de um único lote (não cruza páginas de 12). */
export function flattenFeedWithAds<T extends { id: string }>(
  items: T[],
  mapItem: (item: T) => { tipoItem: 'conteudo'; content: T },
  options?: { adIdPrefix?: string }
): FeedRow<T>[] {
  const prefix = options?.adIdPrefix ?? 'ad';
  const flattened: FeedRow<T>[] = [];
  items.forEach((item, index) => {
    flattened.push(mapItem(item));
    if (index > 0 && (index + 1) % FEED_CARDS_PER_AD_BREAK === 0) {
      flattened.push({ tipoItem: 'anuncio', id: `${prefix}-${index}` });
    }
  });
  return flattened;
}

/**
 * Monta o feed visível em páginas de 12 cards.
 * Cada página: [6 cards][ad][6 cards][ad] — igual ao layout 3×2 + AdSense.
 */
export function buildFeedWithAds<T extends { id: string }>(
  items: T[],
  visibleCount: number,
  mapItem: (item: T) => { tipoItem: 'conteudo'; content: T }
): FeedRow<T>[] {
  const visible = items.slice(0, visibleCount);
  const rows: FeedRow<T>[] = [];
  for (let start = 0; start < visible.length; start += FEED_PAGE_SIZE) {
    const chunk = visible.slice(start, start + FEED_PAGE_SIZE);
    rows.push(
      ...flattenFeedWithAds(chunk, mapItem, { adIdPrefix: `ad-${start}` })
    );
  }
  return rows;
}
