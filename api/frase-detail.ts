/**
 * GET /api/frase-detail?slug=... — uma frase (shards via CDN).
 */
export const config = { runtime: 'edge' };

import {
  findFraseInList,
  requestUrl,
  shardsToProbe,
  type FraseDetailRecord,
} from './_shared.js';

const CACHE = 'public, max-age=31536000, immutable';

async function loadFraseFromShards(
  slug: string,
  assetBase: string
): Promise<FraseDetailRecord | null> {
  const base = assetBase.replace(/\/$/, '');
  for (const shardId of shardsToProbe(slug)) {
    try {
      const res = await fetch(`${base}/frases-v2/detail/shard-${shardId}.json`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const list = (await res.json()) as FraseDetailRecord[];
      const found = findFraseInList(list, slug);
      if (found) return found;
    } catch {
      /* próximo shard */
    }
  }
  return null;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = requestUrl(req);
  const slug = decodeURIComponent(url.searchParams.get('slug') ?? '').toLowerCase().trim();
  if (!slug) {
    return Response.json({ error: 'slug required', found: false }, { status: 400 });
  }

  try {
    const frase = await loadFraseFromShards(slug, url.origin);
    if (!frase) {
      return Response.json({ slug, found: false, message: 'Frase não encontrada' }, { status: 404 });
    }
    return Response.json(frase, { headers: { 'Cache-Control': CACHE } });
  } catch {
    return Response.json(
      { slug, found: false, message: 'Frase não encontrada' },
      { status: 404 }
    );
  }
}
