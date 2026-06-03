/**
 * Busca híbrida multilíngue — índice leve no Supabase (frases_index + frase_search_index).
 * Retorna apenas metadados; detalhe permanece em loadFraseDetailBySlug + fallback shard.
 */

import { getSupabase, isSupabaseConfigured } from '../supabaseClient';

/** Colunas expostas ao browser — sem textos longos */
export const FRASE_SEARCH_SELECT = 'id,slug,titulo' as const;

export type FraseSearchHit = {
  id: string;
  slug: string;
  titulo: string;
};

export type FraseSearchOptions = {
  limit?: number;
  offset?: number;
  /** Locale do usuário — boost de ranking (opcional) */
  locale?: string;
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

function clampLimit(limit?: number): number {
  const n = limit ?? DEFAULT_LIMIT;
  return Math.max(1, Math.min(n, MAX_LIMIT));
}

function mapRows(data: { id: string; slug: string; titulo: string }[] | null): FraseSearchHit[] {
  if (!data?.length) return [];
  return data.map((row) => ({
    id: row.id,
    slug: row.slug.toLowerCase(),
    titulo: row.titulo,
  }));
}

function clientOrNull() {
  if (!isSupabaseConfigured()) return null;
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

async function rpcSearch(
  sb: ReturnType<typeof getSupabase>,
  q: string,
  options?: FraseSearchOptions & { categoriaId?: number | null; tagIds?: number[] | null }
): Promise<FraseSearchHit[]> {
  const limit = clampLimit(options?.limit);
  const offset = Math.max(0, options?.offset ?? 0);

  const { data, error } = await sb.rpc('mm_search_frases_index', {
    p_query: q,
    p_limit: limit,
    p_offset: offset,
    p_locale: options?.locale ?? null,
    p_categoria_id: options?.categoriaId ?? null,
    p_tag_ids: options?.tagIds?.length ? options.tagIds : null,
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[supabase/fraseSearchLoader] mm_search_frases_index', error.message);
    }
    return [];
  }

  return mapRows(data as FraseSearchHit[] | null);
}

/** Busca democrática multilíngue (tsvector) — só metadados. */
export async function searchFrasesIndexByText(
  query: string,
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const sb = clientOrNull();
  if (!sb) return [];

  return rpcSearch(sb, q, options);
}

async function resolveCategoriaId(categoriaSlug: string): Promise<number | null> {
  const sb = clientOrNull();
  if (!sb) return null;
  const slug = categoriaSlug.toLowerCase().trim();
  const { data, error } = await sb.from('categorias').select('id').eq('slug', slug).maybeSingle();
  if (error || !data) return null;
  return data.id as number;
}

async function resolveTagIds(tagSlugs: string[]): Promise<number[]> {
  const sb = clientOrNull();
  if (!sb || !tagSlugs.length) return [];
  const slugs = [...new Set(tagSlugs.map((s) => s.toLowerCase().trim()).filter(Boolean))];
  const { data, error } = await sb.from('tags').select('id,slug').in('slug', slugs);
  if (error || !data?.length) return [];
  return data.map((r) => r.id as number);
}

/** Filtra por categoria (slug) — só metadados. */
export async function searchFrasesIndexByCategoria(
  categoriaSlug: string,
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const categoriaId = await resolveCategoriaId(categoriaSlug);
  if (categoriaId == null) return [];

  const sb = clientOrNull();
  if (!sb) return [];

  const limit = clampLimit(options?.limit);
  const offset = Math.max(0, options?.offset ?? 0);

  const { data, error } = await sb
    .from('frases_index')
    .select(FRASE_SEARCH_SELECT)
    .eq('categoria_id', categoriaId)
    .order('popularidade', { ascending: false })
    .order('id')
    .range(offset, offset + limit - 1);

  if (error) {
    if (import.meta.env.DEV) console.warn('[supabase/fraseSearchLoader] categoria', error.message);
    return [];
  }
  return mapRows(data as FraseSearchHit[] | null);
}

/** Filtra por uma ou mais tags (slug) — overlap em tags_ids. */
export async function searchFrasesIndexByTags(
  tagSlugs: string[],
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const tagIds = await resolveTagIds(tagSlugs);
  if (!tagIds.length) return [];

  const sb = clientOrNull();
  if (!sb) return [];

  const limit = clampLimit(options?.limit);
  const offset = Math.max(0, options?.offset ?? 0);

  const { data, error } = await sb
    .from('frases_index')
    .select(FRASE_SEARCH_SELECT)
    .overlaps('tags_ids', tagIds)
    .order('popularidade', { ascending: false })
    .order('id')
    .range(offset, offset + limit - 1);

  if (error) {
    if (import.meta.env.DEV) console.warn('[supabase/fraseSearchLoader] tags', error.message);
    return [];
  }
  return mapRows(data as FraseSearchHit[] | null);
}

/** Busca combinada (texto + filtros opcionais) — democrática multilíngue. */
export async function searchFrasesIndex(
  query: string,
  filters?: { categoriaSlug?: string; tagSlugs?: string[] },
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const q = query.trim();
  const sb = clientOrNull();
  if (!sb) return [];
  if (!q && !filters?.categoriaSlug && !filters?.tagSlugs?.length) return [];

  if (q) {
    const categoriaId = filters?.categoriaSlug
      ? await resolveCategoriaId(filters.categoriaSlug)
      : null;
    if (filters?.categoriaSlug && categoriaId == null) return [];

    const tagIds = filters?.tagSlugs?.length ? await resolveTagIds(filters.tagSlugs) : null;
    if (filters?.tagSlugs?.length && !tagIds?.length) return [];

    return rpcSearch(sb, q, {
      ...options,
      categoriaId,
      tagIds,
    });
  }

  if (filters?.categoriaSlug) {
    return searchFrasesIndexByCategoria(filters.categoriaSlug, options);
  }
  return searchFrasesIndexByTags(filters?.tagSlugs || [], options);
}
