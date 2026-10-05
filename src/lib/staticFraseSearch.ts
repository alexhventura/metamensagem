/**
 * Busca e listagem via shards CDN (467k) + feed-sample (4k com texto completo).
 * Substitui Supabase frases_index / mm_search_frases_index no browser.
 */

import { expandSearchQuery } from '../../lib/search/expandSearchQuery.mjs';
import { expandSearchTerms } from './semanticSearch';
import {
  forEachIndexShard,
  loadFeedSample,
  type FeedSampleRow,
  type StaticIndexRow,
} from './staticFraseIndex';

export const FRASE_SEARCH_SELECT = 'id,slug,titulo,popularidade' as const;

export type FraseSearchHit = {
  id: string;
  slug: string;
  titulo: string;
  popularidade?: number;
  autor?: string;
  tags?: string[];
};

export type FraseSearchOptions = {
  limit?: number;
  offset?: number;
  afterId?: string;
  afterPopularidade?: number;
  locale?: string;
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;
const TITULO_MAX = 160;

function clampLimit(limit?: number): number {
  const n = limit ?? DEFAULT_LIMIT;
  return Math.max(1, Math.min(n, MAX_LIMIT));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tituloFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .slice(0, 18)
    .join(' ')
    .slice(0, TITULO_MAX);
}

function truncateTitulo(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length <= TITULO_MAX ? t : `${t.slice(0, TITULO_MAX - 1)}…`;
}

function rowToHit(row: StaticIndexRow, score: number): FraseSearchHit {
  return {
    id: row.id,
    slug: row.slug.toLowerCase(),
    titulo: tituloFromSlug(row.slug),
    popularidade: score,
  };
}

function feedToHit(row: FeedSampleRow, score: number): FraseSearchHit {
  const slug = (row.slug || row.id).toLowerCase();
  const autor = (row.autor || '').trim();
  return {
    id: row.id,
    slug,
    titulo: truncateTitulo(row.texto) || tituloFromSlug(slug),
    popularidade: score,
    autor: autor || undefined,
    tags: row.tags?.length ? row.tags : undefined,
  };
}

function includesTerm(text: string, term: string): boolean {
  if (!term) return false;
  let from = 0;
  while (from < text.length) {
    const at = text.indexOf(term, from);
    if (at < 0) return false;
    const before = at === 0 ? '' : text[at - 1];
    const after = text[at + term.length] || '';
    const leftOk = !before || /[^a-z0-9]/.test(before);
    const rightOk = !after || /[^a-z0-9]/.test(after);
    if (leftOk && rightOk) return true;
    from = at + term.length;
  }
  return false;
}

function scoreFeedRow(row: FeedSampleRow, terms: string[], queryNorm: string): number {
  const texto = normalize(row.texto || '');
  const meta = normalize([row.autor, ...(row.tags || [])].filter(Boolean).join(' '));
  const blob = `${texto} ${meta}`;
  let score = 0;
  if (queryNorm && includesTerm(texto, queryNorm)) score += 1000;
  else if (queryNorm && includesTerm(meta, queryNorm)) score += 400;
  for (const term of terms) {
    const t = normalize(term);
    if (t.length >= 3 && includesTerm(blob, t)) score += 12;
  }
  return score;
}

function sortHits(a: FraseSearchHit, b: FraseSearchHit): number {
  const popDiff = (b.popularidade ?? 0) - (a.popularidade ?? 0);
  if (popDiff !== 0) return popDiff;
  return a.id.localeCompare(b.id);
}

function applyPagination(
  hits: FraseSearchHit[],
  options?: FraseSearchOptions
): FraseSearchHit[] {
  const limit = clampLimit(options?.limit);
  const afterId = options?.afterId?.trim();
  const afterPop = options?.afterPopularidade;

  let filtered = hits;
  if (afterId && afterPop != null && Number.isFinite(afterPop)) {
    filtered = hits.filter((h) => {
      const pop = h.popularidade ?? 0;
      if (pop < afterPop) return true;
      if (pop > afterPop) return false;
      return h.id.localeCompare(afterId) > 0;
    });
  } else {
    const offset = Math.max(0, options?.offset ?? 0);
    filtered = hits.slice(offset);
  }

  return filtered.slice(0, limit);
}

function dedupeHits(hits: FraseSearchHit[]): FraseSearchHit[] {
  const byId = new Map<string, FraseSearchHit>();
  for (const hit of hits) {
    const prev = byId.get(hit.id);
    if (!prev || (hit.popularidade ?? 0) > (prev.popularidade ?? 0)) {
      byId.set(hit.id, hit);
    }
  }
  return [...byId.values()];
}

function slugContainsTag(slug: string, tagSlug: string): boolean {
  const tag = tagSlug.toLowerCase();
  const s = slug.toLowerCase();
  if (s === tag) return true;
  if (s.startsWith(`${tag}-`) || s.endsWith(`-${tag}`) || s.includes(`-${tag}-`)) return true;
  return s.split('-').includes(tag);
}

function matchesTagRow(row: StaticIndexRow, tagSlug: string): boolean {
  const tag = tagSlug.toLowerCase();
  if ((row.categoriaPrincipal || '').toLowerCase() === tag) return true;
  if (slugContainsTag(row.slug, tag)) return true;
  if (row.autorSlug && slugContainsTag(row.autorSlug, tag)) return true;
  return false;
}

function feedMatchesFilters(row: FeedSampleRow, categoria?: string, tags: string[] = []): boolean {
  if (!categoria && !tags.length) return true;
  const rowTags = (row.tags || []).map((tag) => normalize(tag));
  if (categoria) {
    const cat = normalize(categoria);
    if (!rowTags.some((tag) => tag === cat || tag.includes(cat))) return false;
  }
  if (tags.length && !tags.some((tag) => rowTags.includes(normalize(tag)))) return false;
  return true;
}

async function searchFeedByText(
  terms: string[],
  queryNorm: string,
  filters?: { categoria?: string; tags?: string[] }
): Promise<FraseSearchHit[]> {
  try {
    const feed = await loadFeedSample();
    const hits: FraseSearchHit[] = [];
    for (const row of feed) {
      if (!feedMatchesFilters(row, filters?.categoria, filters?.tags)) continue;
      const score = scoreFeedRow(row, terms, queryNorm);
      if (score > 0) hits.push(feedToHit(row, score + 30));
    }
    return hits.sort(sortHits);
  } catch {
    return [];
  }
}

function textSearchTerms(query: string, locale?: string): { terms: string[]; queryNorm: string } {
  const semantic = expandSearchQuery(query, locale ?? 'pt');
  const extra = expandSearchTerms(query);
  const terms = [...new Set([...semantic.terms, ...extra.map((t) => normalize(t))])];
  return { terms, queryNorm: normalize(query) };
}

export async function searchFrasesIndexByText(
  query: string,
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const limit = clampLimit(options?.limit);
  const { terms, queryNorm } = textSearchTerms(q, options?.locale);
  const feedHits = await searchFeedByText(terms, queryNorm);
  return applyPagination(feedHits, { ...options, limit });
}

async function paginateFilteredRows(
  filter: (row: StaticIndexRow) => boolean,
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const limit = clampLimit(options?.limit);
  const afterId = options?.afterId?.trim();
  const afterPop = options?.afterPopularidade;
  const offset = Math.max(0, options?.offset ?? 0);

  const results: FraseSearchHit[] = [];
  let skipped = 0;

  await forEachIndexShard((rows) => {
    if (results.length >= limit) return;
    for (const row of rows) {
      if (!filter(row)) continue;

      if (afterId && afterPop != null && Number.isFinite(afterPop)) {
        const pop = 0;
        if (pop > afterPop) continue;
        if (pop === afterPop && row.id.localeCompare(afterId) <= 0) continue;
      } else if (!afterId && skipped < offset) {
        skipped += 1;
        continue;
      }

      results.push(rowToHit(row, 0));
      if (results.length >= limit) break;
    }
  });

  return results;
}

export async function searchFrasesIndexByCategoria(
  categoriaSlug: string,
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const slug = categoriaSlug.toLowerCase().trim();
  if (!slug) return [];
  return paginateFilteredRows(
    (row) => (row.categoriaPrincipal || '').toLowerCase() === slug,
    options
  );
}

export async function searchFrasesIndexByTags(
  tagSlugs: string[],
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const tags = [...new Set(tagSlugs.map((s) => s.toLowerCase().trim()).filter(Boolean))];
  if (!tags.length) return [];

  const feedTagHits: FraseSearchHit[] = [];
  try {
    const feed = await loadFeedSample();
    for (const row of feed) {
      const rowTags = (row.tags || []).map((t) => t.toLowerCase());
      if (tags.some((t) => rowTags.includes(t))) {
        feedTagHits.push(feedToHit(row, 40));
      }
    }
  } catch {
    /* feed opcional */
  }

  const indexHits = await paginateFilteredRows(
    (row) => tags.some((tag) => matchesTagRow(row, tag)),
    options
  );

  if (!feedTagHits.length) return indexHits;

  const merged = dedupeHits([...feedTagHits, ...indexHits]).sort(sortHits);
  return applyPagination(merged, options);
}

export async function searchFrasesIndex(
  query: string,
  filters?: { categoriaSlug?: string; tagSlugs?: string[] },
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const q = query.trim();
  const categoria = filters?.categoriaSlug?.toLowerCase().trim();
  const tags = filters?.tagSlugs?.map((s) => s.toLowerCase().trim()).filter(Boolean) ?? [];

  if (!q && !categoria && !tags.length) return [];
  if (!q && categoria) return searchFrasesIndexByCategoria(categoria, options);
  if (!q && tags.length) return searchFrasesIndexByTags(tags, options);

  const { terms, queryNorm } = textSearchTerms(q, options?.locale);
  const feedHits = await searchFeedByText(terms, queryNorm, { categoria, tags });
  return applyPagination(feedHits, options);
}
