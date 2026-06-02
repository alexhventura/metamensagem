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
    if (res.ok) {
      const frase = normalizeFraseDetailRecord((await res.json()) as FraseDetailRecord) as FraseCms;
      registerFrase(frase);
      return frase;
    }
    if (res.status === 404) return 'not_found';
  } catch (err) {
    console.warn('[frasesModel] API frase-detail failed', err);
  }
  return 'failed';
}

async function ensureShardLoaded(shard: string): Promise<FraseCms[]> {
  if (shardCache.has(shard)) return shardCache.get(shard)!;

  try {
    const res = await fetch(`/frases-v2/detail/shard-${shard}.json`);
    if (res.ok) {
      const data = ((await res.json()) as FraseDetailRecord[]).map(
        (row) => normalizeFraseDetailRecord(row) as FraseCms
      );
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

export async function loadFraseDetailBySlug(slug: string): Promise<FraseCms | null> {
  const key = slug.toLowerCase().trim();
  if (!key) return null;

  const cached = bySlug?.get(key);
  if (cached) return cached;

  const resolved = (await resolveCanonicalSlugFromIndex(key)) ?? key;
  const lookupKey = resolved.toLowerCase();

  const cachedResolved = bySlug?.get(lookupKey);
  if (cachedResolved) return cachedResolved;

  const apiResult = await loadFraseDetailViaApi(lookupKey);
  if (apiResult !== 'failed') {
    if (apiResult === 'not_found') {
      const fromShards = await loadFraseDetailFromClientShards(lookupKey);
      if (fromShards) return fromShards;
      return loadFromFeedSample(lookupKey);
    }
    return apiResult;
  }

  const fromShards = await loadFraseDetailFromClientShards(lookupKey);
  if (fromShards) return fromShards;

  return loadFromFeedSample(lookupKey);
}

export async function loadFraseDetailById(phraseId: string): Promise<FraseCms | null> {
  const id = phraseId.trim();
  if (!id) return null;

  try {
    const res = await fetch('/frases-v2/id-index.json');
    if (res.ok) {
      const map = (await res.json()) as Record<string, string>;
      const slug = map[id];
      if (slug) return loadFraseDetailBySlug(slug);
    }
  } catch {
    /* fallback abaixo */
  }

  return loadFraseDetailBySlug(id);
}

/** URL estável para compartilhar (slug canônico; fallback por id). */
export function fraseShareUrl(
  frase: Pick<FraseCms, 'id' | 'slug'>,
  locale: SeoLocale,
  defaultLocale: SeoLocale,
  origin = typeof window !== 'undefined' ? window.location.origin : 'https://metamensagem.com'
): string {
  const path = frasePath(frase.slug, locale, defaultLocale);
  return `${origin}${path}`;
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
