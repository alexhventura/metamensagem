/** Tipos e helpers de frases (CMS + fase 2 semântica). */

import type { FraseSeoPack, FraseSemantica } from '../../lib/enrichment/types';
import { shardForSlug } from '../../lib/utils/shardForSlug';
import { fraseSlugForUrl, slugifyFraseTexto } from './slug';
import { loadFrasesCmsFallback } from './homeData';

export interface FraseInformacoes {
  ultima_atualizacao: string | null;
  confiabilidade: string | null;
  enriquecimento_fase2?: boolean;
  curadoria_ia?: boolean;
}

export interface FraseCms {
  id: string;
  slug: string;
  frase_original: string;
  autor_original: string;
  autor_slug?: string;
  categoria: string;
  contextos: string[];
  explicacao: string;
  palavras_chave: string[];
  ano_ou_data: string | null;
  fontes: string | null;
  observacao: string | null;
  autor_tipo: string | null;
  nacionalidade: string | null;
  nascimento_falecimento: string | null;
  informacoes?: FraseInformacoes;
  semantica?: FraseSemantica;
  seo?: FraseSeoPack;
}

let cache: FraseCms[] | null = null;
let bySlug: Map<string, FraseCms> | null = null;
const shardCache = new Map<string, FraseCms[]>();

function registerFrase(frase: FraseCms): void {
  if (!bySlug) bySlug = new Map();
  bySlug.set(frase.slug.toLowerCase(), frase);
}

/** Resolve slug longo de link compartilhado → slug canônico do acervo. */
export function findFraseInList(list: FraseCms[], requested: string): FraseCms | null {
  const key = requested.toLowerCase().trim();
  if (!key) return null;

  const exact = list.find((f) => f.slug.toLowerCase() === key);
  if (exact) return exact;

  const prefix = list.find(
    (f) =>
      key.startsWith(f.slug.toLowerCase()) ||
      f.slug.toLowerCase().startsWith(key.slice(0, Math.min(key.length, f.slug.length)))
  );
  if (prefix) return prefix;

  const pseudoFromUrl = slugifyFraseTexto(key.replace(/-/g, ' '));
  const byPseudo = list.find((f) => f.slug.toLowerCase() === pseudoFromUrl);
  if (byPseudo) return byPseudo;

  const byCanonicalText = list.find((f) => slugifyFraseTexto(f.frase_original) === key);
  if (byCanonicalText) return byCanonicalText;

  const byCanonicalMatch = list.find((f) => {
    const canonical = slugifyFraseTexto(f.frase_original);
    return key.startsWith(canonical) || canonical === pseudoFromUrl;
  });
  return byCanonicalMatch ?? null;
}

function shardsToProbe(requested: string): string[] {
  const key = requested.toLowerCase();
  const ids = new Set<string>([shardForSlug(key)]);
  const pseudo = slugifyFraseTexto(key.replace(/-/g, ' '));
  ids.add(shardForSlug(pseudo));
  if (key.length > 80) {
    ids.add(shardForSlug(key.slice(0, 80)));
  }
  return [...ids];
}

async function ensureShardLoaded(shard: string): Promise<FraseCms[]> {
  if (shardCache.has(shard)) return shardCache.get(shard)!;

  try {
    const res = await fetch(`/frases-v2/detail/shard-${shard}.json`);
    if (res.ok) {
      const data = (await res.json()) as FraseCms[];
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

export async function loadFraseDetailBySlug(slug: string): Promise<FraseCms | null> {
  const key = slug.toLowerCase().trim();
  if (!key) return null;

  const cached = bySlug?.get(key);
  if (cached) return cached;

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
