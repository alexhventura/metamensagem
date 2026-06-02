import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { shardForSlug } from '../utils/shardForSlug';

export type OgFrasePayload = {
  id: string;
  slug: string;
  texto: string;
  autor: string;
  categoria?: string;
};

let idIndexCache: Record<string, string> | null = null;

async function loadIdIndex(root: string): Promise<Record<string, string>> {
  if (idIndexCache) return idIndexCache;
  const path = join(root, 'public', 'frases-v2', 'id-index.json');
  if (!existsSync(path)) {
    idIndexCache = {};
    return idIndexCache;
  }
  idIndexCache = JSON.parse(await readFile(path, 'utf8')) as Record<string, string>;
  return idIndexCache;
}

async function loadFromDetailShard(
  root: string,
  slug: string
): Promise<OgFrasePayload | null> {
  const shard = shardForSlug(slug);
  const path = join(root, 'public', 'frases-v2', 'detail', `shard-${shard}.json`);
  if (!existsSync(path)) return null;
  const list = JSON.parse(await readFile(path, 'utf8')) as Array<{
    id: string;
    slug: string;
    texto?: string;
    frase_original?: string;
    autor?: string;
    autor_original?: string;
    semantica?: { categoriaPrincipal?: string };
    categoria?: string;
  }>;
  const row = list.find((f) => f.slug?.toLowerCase() === slug.toLowerCase());
  if (!row) return null;
  const texto = (row.frase_original || row.texto || '').trim();
  const autor = (row.autor_original || row.autor || 'Anônimo').trim();
  if (!texto) return null;
  return {
    id: row.id,
    slug: row.slug,
    texto,
    autor,
    categoria: row.semantica?.categoriaPrincipal || row.categoria,
  };
}

/** Resolve frase por id (f_csv_…) ou slug para OG image. */
export async function findFraseForOg(
  idOrSlug: string,
  root = process.cwd()
): Promise<OgFrasePayload | null> {
  const key = decodeURIComponent(idOrSlug).trim();
  if (!key) return null;

  const index = await loadIdIndex(root);
  let slug = key;

  if (key.startsWith('f_') || key.startsWith('f_csv_')) {
    slug = index[key] || key;
  }

  if (slug.includes('-') && !slug.startsWith('f_')) {
    const bySlug = await loadFromDetailShard(root, slug);
    if (bySlug) return bySlug;
  }

  const mappedSlug = index[key];
  if (mappedSlug) {
    return loadFromDetailShard(root, mappedSlug);
  }

  return loadFromDetailShard(root, slug);
}

export function previewSerialForQuote(quoteId: string): string {
  const year = new Date().getFullYear();
  let hash = 0;
  const str = `${quoteId}-${year}`;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  const seq = (Math.abs(hash) % 99_999_999) + 1;
  return `MMM-${year}-${String(seq).padStart(8, '0')}`;
}
