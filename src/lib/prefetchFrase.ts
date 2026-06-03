import { getFraseCmsBySlugSync, loadFraseDetailBySlug, type LoadFraseDetailOptions } from './frasesModel';

const inflight = new Map<string, Promise<unknown>>();

/**
 * Pré-carrega detalhe da frase (memória + IndexedDB + rede) sem bloquear a UI.
 * Idempotente — chamadas duplicadas compartilham a mesma promise.
 */
export function prefetchFraseDetail(slug: string, options?: LoadFraseDetailOptions): void {
  const key = slug.toLowerCase().trim();
  if (!key || typeof window === 'undefined') return;
  if (getFraseCmsBySlugSync(key)) return;
  if (inflight.has(key)) return;

  const task = loadFraseDetailBySlug(key, options).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, task);
}
