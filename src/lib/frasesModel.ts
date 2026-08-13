/** Tipos e helpers de frases (CMS + fase 2 semântica). */

import type { FraseSeoPack, FraseSemantica } from '../../lib/enrichment/types';
import {
  findFraseInList as findFraseInListShared,
  normalizeFraseDetailRecord,
  resolveCanonicalSlugFromIndex,
  shardsToProbe,
  type FraseDetailRecord,
} from '../../lib/frases/detailLookup';
import type { SeoLocale } from '../../lib/i18n/locales';
import { frasePath } from './i18nRoutes';
import { fraseSlugForUrl } from './slug';
import { loadFrasesCmsFallback } from './homeData';
import {
  getCachedFraseDetail,
  getCachedShard,
  persistFraseDetail,
  persistShard,
} from './fraseDetailCache';
import {
  recordCacheHit,
  recordFraseDetailLatency,
  type CacheLayer,
} from './observability/performanceMetrics';
import { staticAssetUrl } from './staticAssetOrigin';
import {
  searchFrasesIndex,
  searchFrasesIndexByCategoria,
  searchFrasesIndexByTags,
  searchFrasesIndexByText,
  type FraseSearchHit,
  type FraseSearchOptions,
} from './supabase/fraseSearchLoader';

export type FraseDetailLoadResult = {
  frase: FraseCms;
  display: {
    texto: string;
    autor: string;
    explicacao?: string;
    isTranslated: boolean;
  };
};

export type LoadFraseDetailOptions = {
  locale?: string;
};

export type { FraseSearchHit, FraseSearchOptions };

export {
  searchFrasesIndex,
  searchFrasesIndexByText,
  searchFrasesIndexByCategoria,
  searchFrasesIndexByTags,
};

export interface FraseInformacoes {
  ultima_atualizacao: string | null;
  confiabilidade: string | null;
  enriquecimento_fase2?: boolean;
  curadoria_ia?: boolean;
}

export interface FraseCms extends FraseDetailRecord {
  semantica?: FraseSemantica;
  seo?: FraseSeoPack;
}

let cache: FraseCms[] | null = null;
let bySlug: Map<string, FraseCms> | null = null;
const shardCache = new Map<string, FraseCms[]>();

function registerFrase(frase: FraseCms | FraseDetailRecord): void {
  const normalized = normalizeFraseDetailRecord(frase) as FraseCms;
  if (!bySlug) bySlug = new Map();
  bySlug.set(normalized.slug.toLowerCase(), normalized);
}

export function findFraseInList(list: FraseCms[], requested: string): FraseCms | null {
  return findFraseInListShared(list, requested);
}

async function loadFraseDetailViaApi(key: string): Promise<FraseCms | 'not_found' | 'failed'> {
  try {
    const res = await fetch(`/api/frase-detail?slug=${encodeURIComponent(key)}`);
    if (res.status === 404) return 'not_found';
    if (!res.ok) return 'failed';
    const data = (await res.json()) as FraseDetailRecord & { found?: boolean };
    if (data.found === false) return 'not_found';
    const frase = normalizeFraseDetailRecord(data) as FraseCms;
    if (!frase.frase_original?.trim() && !frase.texto?.trim()) return 'not_found';
    registerFrase(frase);
    return frase;
  } catch (err) {
    console.warn('[frasesModel] API frase-detail failed', err);
  }
  return 'failed';
}

async function ensureShardLoaded(shard: string): Promise<FraseCms[]> {
  if (shardCache.has(shard)) return shardCache.get(shard)!;

  const fromIdb = await getCachedShard(shard);
  if (fromIdb?.length) {
    const data = fromIdb.map((row) => normalizeFraseDetailRecord(row) as FraseCms);
    shardCache.set(shard, data);
    for (const f of data) registerFrase(f);
    return data;
  }

  try {
    const res = await fetch(staticAssetUrl(`/frases-v2/detail/shard-${shard}.json`));
    if (res.ok) {
      const raw = (await res.json()) as FraseDetailRecord[];
      void persistShard(shard, raw);
      const data = raw.map((row) => normalizeFraseDetailRecord(row) as FraseCms);
      shardCache.set(shard, data);
      for (const f of data) registerFrase(f);
      return data;
    }
    shardCache.set(shard, []);
  } catch (err) {
    console.warn('[frasesModel] shard fetch failed', shard, err);
    shardCache.set(shard, []);
  }
  return [];
}

async function loadFraseDetailFromClientShards(key: string): Promise<FraseCms | null> {
  for (const shardId of shardsToProbe(key)) {
    const list = await ensureShardLoaded(shardId);
    const found = findFraseInList(list, key);
    if (found) {
      registerFrase(found);
      return found;
    }
  }

  if (bySlug) {
    const fromIndex = findFraseInList([...bySlug.values()], key);
    if (fromIndex) return fromIndex;
  }

  return null;
}

async function loadFromFeedSample(key: string): Promise<FraseCms | null> {
  try {
    const res = await fetch('/frases-v2/feed-sample.json');
    if (!res.ok) return null;
    const feed = (await res.json()) as {
      id: string;
      slug?: string;
      texto: string;
      autor: string;
      tags?: string[];
    }[];
    const list = feed.map((row) => {
      const normalized = normalizeFraseDetailRecord({
        id: row.id,
        slug: fraseSlugForUrl(row.slug, row.texto, row.id),
        frase_original: row.texto,
        autor_original: row.autor,
        categoria: row.tags?.[0] || 'reflexao',
        contextos: row.tags?.slice(1) || [],
        explicacao: '',
        palavras_chave: row.tags || [],
        ano_ou_data: null,
        fontes: null,
        observacao: null,
        autor_tipo: null,
        nacionalidade: null,
        nascimento_falecimento: null,
      }) as FraseCms;
      registerFrase(normalized);
      return normalized;
    });
    return findFraseInList(list, key);
  } catch {
    return null;
  }
}

/**
 * Busca no índice leve (CDN). Retorna só id, slug, titulo.
 * Detalhe: use loadFraseDetailBySlug(slug) — shards CDN + id-index.
 */
export async function searchFrasesByText(
  query: string,
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  return searchFrasesIndexByText(query, options);
}

export async function searchFrasesByCategoria(
  categoriaSlug: string,
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  return searchFrasesIndexByCategoria(categoriaSlug, options);
}

export async function searchFrasesByTags(
  tagSlugs: string[],
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  return searchFrasesIndexByTags(tagSlugs, options);
}

export async function searchFrases(
  query: string,
  filters?: { categoriaSlug?: string; tagSlugs?: string[] },
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  return searchFrasesIndex(query, filters, options);
}

/** Converte hit de busca em item de lista (UI existente) sem carregar detalhe. */
export function fraseListItemFromSearchHit(hit: FraseSearchHit) {
  return {
    id: hit.id,
    tipo: 'frase' as const,
    texto: hit.titulo,
    autor: '',
    tags: [] as string[],
    slug: hit.slug,
  };
}

/** Carrega frase + display (CDN-only). */
export async function loadFraseDetailBySlug(
  slug: string,
  options?: LoadFraseDetailOptions
): Promise<FraseDetailLoadResult | null> {
  const key = slug.toLowerCase().trim();
  if (!key) return null;

  const started = typeof performance !== 'undefined' ? performance.now() : 0;
  const finish = (layer: CacheLayer, bundle: FraseDetailLoadResult): FraseDetailLoadResult => {
    if (started) recordFraseDetailLatency(performance.now() - started, layer);
    return bundle;
  };

  const mem = bySlug?.get(key);
  if (mem) {
    const defaultLocale = mem.semantica?.languageOriginal || mem.semantica?.idiomaOriginal || 'pt';
    return finish('memory', {
      frase: mem,
      display: {
        texto: mem.frase_original,
        autor: mem.autor_original,
        explicacao: mem.explicacao || undefined,
        isTranslated: false,
      },
    });
  }

  const cached = await getCachedFraseDetail(key);
  if (cached) {
    registerFrase(cached.frase);
    return finish('indexeddb', cached);
  }

  let bundle = await loadFraseDetailBySlugLegacy(key);
  if (bundle) {
    void persistFraseDetail(bundle.frase.slug, bundle);
    return finish('cdn', bundle);
  }

  if (started) recordFraseDetailLatency(performance.now() - started, 'miss');
  else recordCacheHit('miss');
  return null;
}

/** Shards + /api/frase-detail — resolução de detalhe via CDN. */
async function loadFraseDetailBySlugLegacy(slug: string): Promise<FraseDetailLoadResult | null> {
  const key = slug.toLowerCase().trim();

  const toBundle = (frase: FraseCms): FraseDetailLoadResult => {
    registerFrase(frase);
    return {
      frase,
      display: {
        texto: frase.frase_original,
        autor: frase.autor_original,
        explicacao: frase.explicacao || undefined,
        isTranslated: false,
      },
    };
  };

  let apiResult = await loadFraseDetailViaApi(key);
  if (apiResult !== 'failed' && apiResult !== 'not_found') {
    return toBundle(apiResult);
  }

  const resolved = (await resolveCanonicalSlugFromIndex(key)) ?? key;
  const lookupKey = resolved.toLowerCase();

  if (lookupKey !== key) {
    apiResult = await loadFraseDetailViaApi(lookupKey);
    if (apiResult !== 'failed' && apiResult !== 'not_found') {
      return toBundle(apiResult);
    }
  }

  const frase =
    (await loadFraseDetailFromClientShards(lookupKey)) ??
    (await loadFromFeedSample(lookupKey));

  if (!frase?.frase_original?.trim() && !frase?.texto?.trim()) return null;
  if (!frase) return null;
  return toBundle(frase);
}

export async function loadFraseDetailById(phraseId: string): Promise<FraseCms | null> {
  const id = phraseId.trim();
  if (!id) return null;

  try {
    const res = await fetch('/frases-v2/id-index.json');
    if (res.ok) {
      const map = (await res.json()) as Record<string, string>;
      const slug = map[id];
      if (slug) {
        const bundle = await loadFraseDetailBySlug(slug);
        return bundle?.frase ?? null;
      }
    }
  } catch {
    /* ignore */
  }

  const bundle = await loadFraseDetailBySlug(id);
  return bundle?.frase ?? null;
}

/** URL estável para compartilhar — /f/:id redireciona ao slug canônico (resiliente a truncamento). */
export function fraseShareUrl(
  frase: Pick<FraseCms, 'id' | 'slug'>,
  _locale: SeoLocale,
  _defaultLocale: SeoLocale,
  origin = typeof window !== 'undefined' ? window.location.origin : 'https://metamensagem.com'
): string {
  return `${origin}/f/${encodeURIComponent(frase.id)}`;
}

export async function loadFrasesCms(): Promise<FraseCms[]> {
  if (cache) return cache;

  try {
    const manifestRes = await fetch('/frases-v2/manifest.json');
    if (manifestRes.ok) {
      const feedRes = await fetch('/frases-v2/feed-sample.json');
      if (feedRes.ok) {
        const feed = (await feedRes.json()) as {
          slug: string;
          texto: string;
          autor: string;
          tags: string[];
          id: string;
        }[];
        cache = feed.map((f) => ({
          id: f.id,
          slug: fraseSlugForUrl(f.slug, f.texto, f.id),
          frase_original: f.texto,
          autor_original: f.autor,
          categoria: f.tags[0] || 'reflexao',
          contextos: f.tags.slice(1),
          explicacao: '',
          palavras_chave: f.tags,
          ano_ou_data: null,
          fontes: null,
          observacao: null,
          autor_tipo: null,
          nacionalidade: null,
          nascimento_falecimento: null,
        }));
        bySlug = new Map(cache.map((f) => [f.slug.toLowerCase(), f]));
        return cache;
      }
    }
  } catch {
    /* fallback */
  }

  const items = await loadFrasesCmsFallback();
  if (!items.length) return [];
  cache = items.map((f) => ({
    id: f.id,
    slug: fraseSlugForUrl(f.slug, f.texto, f.id),
    frase_original: f.texto,
    autor_original: f.autor,
    categoria: f.tags?.[0] || 'reflexao',
    contextos: f.tags?.slice(1) || [],
    explicacao: '',
    palavras_chave: f.tags || [],
    ano_ou_data: null,
    fontes: null,
    observacao: null,
    autor_tipo: null,
    nacionalidade: null,
    nascimento_falecimento: null,
  }));
  bySlug = new Map(cache.map((f) => [f.slug.toLowerCase(), f]));
  return cache;
}

export function getFraseCmsBySlugSync(slug: string): FraseCms | undefined {
  const key = slug.toLowerCase().trim();
  const direct = bySlug?.get(key);
  if (direct) return direct;
  if (bySlug) {
    return findFraseInList([...bySlug.values()], key) ?? undefined;
  }
  return undefined;
}

export function fraseToListItem(f: FraseCms) {
  return {
    id: f.id,
    tipo: 'frase' as const,
    texto: f.frase_original,
    autor: f.autor_original,
    tags: f.palavras_chave?.length ? f.palavras_chave : [f.categoria, ...f.contextos],
    slug: f.slug,
  };
}

export function primeFrasesCms(frases: FraseCms[]): void {
  cache = frases;
  bySlug = new Map(frases.map((f) => [f.slug.toLowerCase(), f]));
}

/** Converte item de card/lista em FraseCms mínimo (navegação com state). */
export function fraseCmsFromListItem(item: {
  id: string;
  slug?: string;
  texto: string;
  autor: string;
  tags?: string[];
}): FraseCms {
  const slug = fraseSlugForUrl(item.slug, item.texto, item.id);
  const tags = item.tags || [];
  return {
    id: item.id,
    slug,
    frase_original: item.texto,
    autor_original: item.autor || 'Anônimo',
    categoria: tags[0] || 'reflexao',
    contextos: tags.slice(1),
    explicacao: '',
    palavras_chave: tags,
    ano_ou_data: null,
    fontes: null,
    observacao: null,
    autor_tipo: null,
    nacionalidade: null,
    nascimento_falecimento: null,
  };
}
