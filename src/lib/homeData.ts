/**
 * Home: O(1) bootstrap leve; catálogo completo só após paint (idle).
 */

import type { ItemConteudo } from '../types/content';
import { sanitizeContentBanco } from './safeContent';
import { buildTagRegistry } from './tagsSeo';
import { primeFrasesCms, fraseToListItem } from './frasesModel';

export const HOME_BOOTSTRAP_URL = '/home-bootstrap.json';
export const CATALOG_URLS = ['/metaforas-index.json', '/frases-v2/feed-sample.json'] as const;

export interface HomeBootstrap {
  v: number;
  metaforas: unknown[];
  frases: unknown[];
  tags: string[];
}

export interface CatalogLoadResult {
  items: ItemConteudo[];
  tags: string[];
}

function frasesRawToCms(frasesRaw: unknown[]) {
  const frasesFeed = sanitizeContentBanco(frasesRaw);
  if (!frasesFeed.length) return [];
  const cms = frasesFeed.map((f) => ({
    id: String(f.id),
    slug: String(f.slug || f.id),
    frase_original: String(f.texto),
    autor_original: String(f.autor || 'Anônimo'),
    categoria: Array.isArray(f.tags) ? String(f.tags[0]) : 'reflexao',
    contextos: Array.isArray(f.tags) ? f.tags.slice(1).map(String) : [],
    explicacao: '',
    palavras_chave: Array.isArray(f.tags) ? f.tags.map(String) : [],
    ano_ou_data: null,
    fontes: null,
    observacao: null,
    autor_tipo: null,
    nacionalidade: null,
    nascimento_falecimento: null,
  }));
  primeFrasesCms(cms);
  return frasesFeed as ItemConteudo[];
}

export function mergeCatalog(metaforasRaw: unknown[], frasesRaw: unknown[]): CatalogLoadResult {
  const metaforas = sanitizeContentBanco(metaforasRaw) as ItemConteudo[];
  const frases = frasesRawToCms(frasesRaw);
  const items = [...metaforas, ...frases] as ItemConteudo[];
  const tags = buildTagRegistry(items).map((r) => r.tag);
  return { items, tags };
}

export async function loadHomeBootstrap(): Promise<CatalogLoadResult> {
  const res = await fetch(HOME_BOOTSTRAP_URL, { cache: 'default' });
  if (!res.ok) throw new Error(`home-bootstrap: ${res.status}`);
  const data = (await res.json()) as HomeBootstrap;
  const merged = mergeCatalog(data.metaforas || [], data.frases || []);
  const tagSet = new Set([...data.tags, ...merged.tags]);
  return { items: merged.items, tags: [...tagSet].slice(0, 48) };
}

export async function loadFullCatalog(): Promise<CatalogLoadResult> {
  const CACHE_NAME = 'mm-catalog-v2';
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await Promise.all(CATALOG_URLS.map((url) => cache.match(url)));
    if (cached.every(Boolean)) {
      const data = await Promise.all(cached.map((r) => r!.json()));
      return mergeCatalog(data[0], data[1]);
    }
  } catch {
    /* cache API indisponível */
  }

  const responses = await Promise.all(CATALOG_URLS.map((url) => fetch(url)));
  if (!responses.every((r) => r.ok)) {
    throw new Error('Falha ao carregar catálogo completo');
  }

  const cloned = responses.map((r) => r.clone());
  const data = await Promise.all(responses.map((r) => r.json()));

  try {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(cloned.map((res, i) => cache.put(CATALOG_URLS[i], res)));
  } catch {
    /* ignore */
  }

  return mergeCatalog(data[0], data[1]);
}

export function scheduleCatalogPrefetch(onReady: (result: CatalogLoadResult) => void): void {
  const run = () => {
    loadFullCatalog()
      .then(onReady)
      .catch((e) => console.warn('Prefetch catálogo:', e));
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 8000 });
  } else {
    setTimeout(run, 1200);
  }
}

/** Legado: frases-cms só para rotas /frases quando feed/shards falham. */
export async function loadFrasesCmsFallback(): Promise<ItemConteudo[]> {
  try {
    const res = await fetch('/frases-cms.json');
    if (!res.ok) return [];
    const cms = (await res.json()) as Parameters<typeof primeFrasesCms>[0];
    primeFrasesCms(cms);
    return cms.map(fraseToListItem) as ItemConteudo[];
  } catch {
    return [];
  }
}
