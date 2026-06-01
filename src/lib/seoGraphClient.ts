/** Cliente leve para grafo SEO (sem carregar acervo inteiro). */

import type { QuoteRelations } from '../../lib/seo/phase3/types';
import { shardForSlug } from '../../lib/utils/shardForSlug';

export async function fetchQuoteRelations(slug: string): Promise<QuoteRelations | null> {
  const sk = shardForSlug(slug);
  try {
    const res = await fetch(`/seo-graph/relations/shard-${sk}.json`);
    if (!res.ok) return null;
    const map = (await res.json()) as Record<string, QuoteRelations>;
    return map[slug] ?? null;
  } catch {
    return null;
  }
}

export async function searchSemantic(term: string, limit = 40): Promise<string[]> {
  const t = term.toLowerCase().trim();
  if (!t) return [];
  const bucket = t[0];
  if (!/^[a-z0-9]$/.test(bucket)) return [];
  try {
    const res = await fetch(`/seo-graph/search/part-${bucket}.json`);
    if (!res.ok) return [];
    const part = (await res.json()) as Record<string, string[]>;
    const direct = part[t] || [];
    const autorKey = `autor:${t}`;
    const byAutor = part[autorKey] || [];
    return [...new Set([...direct, ...byAutor])].slice(0, limit);
  } catch {
    return [];
  }
}
