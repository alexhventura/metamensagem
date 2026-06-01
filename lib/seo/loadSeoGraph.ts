import fs from 'fs';
import path from 'path';
import type { ClusterPagePack, QuoteRelations, SeoPagePack } from './phase3/types';
import { shardForSlug } from '../enrichment/enrichFrase';

const ROOT = process.cwd();

export function loadClusterPage(clusterSlug: string): ClusterPagePack | null {
  const p = path.join(ROOT, 'public', 'seo-graph', 'pages', 'clusters', `${clusterSlug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as ClusterPagePack;
}

export function loadAuthorPage(autorSlug: string): SeoPagePack | null {
  const sk = shardForSlug(autorSlug);
  const p = path.join(ROOT, 'public', 'seo-graph', 'pages', 'autores', `shard-${sk}.json`);
  if (!fs.existsSync(p)) return null;
  const map = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, SeoPagePack>;
  return map[autorSlug] ?? null;
}

export function loadQuoteRelations(slug: string): QuoteRelations | null {
  const sk = shardForSlug(slug);
  const p = path.join(ROOT, 'public', 'seo-graph', 'relations', `shard-${sk}.json`);
  if (!fs.existsSync(p)) return null;
  const map = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, QuoteRelations>;
  return map[slug] ?? null;
}
