/** Limites do catálogo no cliente — menos DOM e menos trabalho síncrono no main thread. */

/** Frases do feed-sample mantidas em memória para listas/busca (feed-sample tem ~4000). */
export const CATALOG_FRASES_LIST_CAP = 500;

/** Pool embaralhado para o feed aleatório da home (sem shuffle de milhares de itens). */
export const HOME_FRASE_POOL_SIZE = 96;

const TAG_PATH_RE = /^\/mensagens-de-/;

const FRASE_DETAIL_RE = /^\/frases\/[^/]+/;
const FRASE_DETAIL_LOCALE_RE = /^\/(en|es|fr|de|it|ja|hi)\/frases\/[^/]+/;

export function pathNeedsFullCatalog(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === '/frases' || p === '/metaforas') return true;
  if (FRASE_DETAIL_RE.test(p) || FRASE_DETAIL_LOCALE_RE.test(p)) return true;
  return TAG_PATH_RE.test(p);
}

/** Amostra aleatória sem embaralhar o array inteiro. */
export function sampleShuffled<T>(items: T[], poolSize: number): T[] {
  if (!items.length) return [];
  const n = Math.min(poolSize, items.length);
  if (items.length <= n) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const picked = new Set<number>();
  const result: T[] = [];
  while (result.length < n) {
    const j = Math.floor(Math.random() * items.length);
    if (picked.has(j)) continue;
    picked.add(j);
    result.push(items[j]);
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
