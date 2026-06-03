/**
 * GET /api/frase-detail?slug=... — uma frase (shards via CDN).
 */
import {
  findFraseInList,
  normalizeFraseDetailRecord,
  resolveCanonicalSlugFromIndex,
  shardsToProbe,
  type FraseDetailRecord,
} from '../lib/frases/detailLookup.js';
import { requestUrl, sendJson, type ApiResponse } from './_http.js';
import type { ApiRequest } from './_shared.js';

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

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const url = requestUrl(req);
  const slug = decodeURIComponent(url.searchParams.get('slug') ?? '').toLowerCase().trim();
  if (!slug) {
    sendJson(res, 400, { error: 'slug required', found: false });
    return;
  }

  try {
    const assetBase = url.origin;
    const fetchJson = async (path: string) => {
      const res = await fetch(`${assetBase}${path}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    };

    const resolved = (await resolveCanonicalSlugFromIndex(slug, fetchJson)) ?? slug;
    let frase = await loadFraseFromShards(resolved, assetBase);
    if (!frase && resolved !== slug) {
      frase = await loadFraseFromShards(slug, assetBase);
    }
    if (!frase) {
      sendJson(res, 404, { slug, found: false, message: 'Frase não encontrada' });
      return;
    }
    sendJson(res, 200, normalizeFraseDetailRecord(frase), { 'Cache-Control': CACHE });
  } catch {
    sendJson(res, 404, { slug, found: false, message: 'Frase não encontrada' });
  }
}
