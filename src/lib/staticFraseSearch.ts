/**
 * Busca e listagem via shards CDN (467k) + feed-sample (4k com texto completo).
 * Substitui Supabase frases_index / mm_search_frases_index no browser.
 */

import { expandSearchQuery } from '../../lib/search/expandSearchQuery.mjs';
import { expandSearchTerms } from './semanticSearch';
import {
  forEachIndexShard,
  loadFeedSample,
  loadIndexShard,
  listShardIds,
  type FeedSampleRow,
  type StaticIndexRow,
} from './staticFraseIndex';

export const FRASE_SEARCH_SELECT = 'id,slug,titulo,popularidade' as const;

export type FraseSearchHit = {
  id: string;
  slug: string;
  titulo: string;
  popularidade?: number;
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
const SHARD_BATCH = 16;

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
  return {
    id: row.id,
    slug,
    titulo: truncateTitulo(row.texto) || tituloFromSlug(slug),
    popularidade: score,
  };
}

function scoreIndexRow(
  row: StaticIndexRow,
  terms: string[],
  themes: string[],
  queryNorm: string
): number {
  const slugText = normalize(row.slug.replace(/-/g, ' '));
  const categoria = normalize(row.categoriaPrincipal || '');
  const autor = normalize((row.autorSlug || '').replace(/-/g, ' '));

  let score = 0;
  if (queryNorm && slugText.includes(queryNorm)) score += 20;
  if (queryNorm && categoria === queryNorm) score += 12;

  for (const term of terms) {
    const t = normalize(term);
    if (!t || t.length < 2) continue;
    if (slugText.includes(t)) score += t.length >= 4 ? 10 : 6;
    if (categoria.includes(t)) score += 8;
    if (autor.includes(t)) score += 4;
  }

  for (const theme of themes) {
    const th = normalize(theme);
    if (categoria === th || slugText.includes(th)) score += 6;
  }

  return score;
}

function scoreFeedRow(row: FeedSampleRow, terms: string[], queryNorm: string): number {
  const blob = normalize(
    [row.texto, row.autor, ...(row.tags || [])].filter(Boolean).join(' ')
  );
  let score = 0;
  if (queryNorm && blob.includes(queryNorm)) score += 24;
  for (const term of terms) {
    const t = normalize(term);
    if (t.length >= 2 && blob.includes(t)) score += 12;
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

async function searchFeedByText(
  query: string,
  terms: string[],
  queryNorm: string
): Promise<FraseSearchHit[]> {
  try {
    const feed = await loadFeedSample();
    const hits: FraseSearchHit[] = [];
    for (const row of feed) {
      const score = scoreFeedRow(row, terms, queryNorm);
      if (score > 0) hits.push(feedToHit(row, score + 30));
    }
    return hits.sort(sortHits);
  } catch {
    return [];
  }
}

async function collectIndexTextMatches(
  query: string,
  terms: string[],
  themes: string[],
  queryNorm: string,
  maxCandidates: number
): Promise<FraseSearchHit[]> {
  const shardIds = await listShardIds();
  const candidates: FraseSearchHit[] = [];

  for (let i = 0; i < shardIds.length; i += SHARD_BATCH) {
    const batch = shardIds.slice(i, i + SHARD_BATCH);
    const shards = await Promise.all(batch.map((id) => loadIndexShard(id)));
    for (const rows of shards) {
      for (const row of rows) {
        const score = scoreIndexRow(row, terms, themes, queryNorm);
        if (score > 0) candidates.push(rowToHit(row, score));
      }
    }
    if (candidates.length > maxCandidates) {
      candidates.sort(sortHits);
      candidates.length = Math.floor(maxCandidates / 2);
    }
  }

  return candidates;
}

export async function searchFrasesIndexByText(
  query: string,
  options?: FraseSearchOptions
): Promise<FraseSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const limit = clampLimit(options?.limit);
  const semantic = expandSearchQuery(q, options?.locale ?? 'pt');
  const extra = expandSearchTerms(q);
  const terms = [...new Set([...semantic.terms, ...extra.map((t) => normalize(t))])];
  const queryNorm = normalize(q);

  const [feedHits, indexHits] = await Promise.all([
    searchFeedByText(q, terms, queryNorm),
    collectIndexTextMatches(q, terms, semantic.themes, queryNorm, limit * 24),
  ]);

  const merged = dedupeHits([...feedHits, ...indexHits]).sort(sortHits);
  return applyPagination(merged, { ...options, limit });
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

  const limit = clampLimit(options?.limit);
  const semantic = expandSearchQuery(q, options?.locale ?? 'pt');
  const extra = expandSearchTerms(q);
  const terms = [...new Set([...semantic.terms, ...extra.map((t) => normalize(t))])];
  const queryNorm = normalize(q);

  const feedPromise = searchFeedByText(q, terms, queryNorm);
  const narrowed: FraseSearchHit[] = [];

  await forEachIndexShard((rows) => {
    if (narrowed.length >= limit * 8) return;
    for (const row of rows) {
      if (categoria && (row.categoriaPrincipal || '').toLowerCase() !== categoria) continue;
      if (tags.length && !tags.some((tag) => matchesTagRow(row, tag))) continue;
      const score = scoreIndexRow(row, terms, semantic.themes, queryNorm);
      if (score > 0) narrowed.push(rowToHit(row, score));
    }
  });

  const feedHits = await feedPromise;
  const feedFiltered =
    categoria || tags.length
      ? feedHits.filter((hit) => {
          /* feed hits não carregam categoria — mantidos só se também aparecerem no índice */
          return narrowed.some((n) => n.id === hit.id);
        })
      : feedHits;

  const merged = dedupeHits([...feedFiltered, ...narrowed]).sort(sortHits);
  return applyPagination(merged, options);
}
