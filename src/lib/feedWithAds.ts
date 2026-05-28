/** Insere anúncio após cada bloco de 6 cards (2 linhas × 3 colunas no desktop). */
export function flattenFeedWithAds<T extends { id: string }>(
  items: T[],
  mapItem: (item: T) => { tipoItem: 'conteudo'; content: T }
): Array<{ tipoItem: 'conteudo'; content: T } | { tipoItem: 'anuncio'; id: string }> {
  const flattened: Array<
    { tipoItem: 'conteudo'; content: T } | { tipoItem: 'anuncio'; id: string }
  > = [];
  items.forEach((item, index) => {
    flattened.push(mapItem(item));
    if (index > 0 && (index + 1) % 6 === 0) {
      flattened.push({ tipoItem: 'anuncio', id: `ad-${index}` });
    }
  });
  return flattened;
}
