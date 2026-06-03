/**
 * GET /api/frase-detail?slug=... — detalhe da frase (Supabase + shard CDN).
 */
import { normalizeFraseDetailRecord } from '../lib/frases/detailLookup.js';
import { requestUrl, sendJson, type ApiResponse } from './_http.js';
import type { ApiRequest } from './_shared.js';
import { resolveFraseDetailBySlug } from './fraseDetailService.js';

const CACHE_HIT = 'public, max-age=86400, stale-while-revalidate=604800';
const CACHE_MISS = 'public, max-age=300';

function notFound(res: ApiResponse, slug: string): void {
  sendJson(
    res,
    404,
    { slug, found: false, message: 'Frase não encontrada' },
    { 'Cache-Control': CACHE_MISS }
  );
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed', found: false });
    return;
  }

  const started = Date.now();
  let slug = '';

  try {
    const url = requestUrl(req);
    slug = decodeURIComponent(url.searchParams.get('slug') ?? '').toLowerCase().trim();

    if (!slug) {
      sendJson(res, 400, { error: 'slug required', found: false });
      return;
    }

    const frase = await resolveFraseDetailBySlug(slug, url.origin);

    console.info('[frase-detail]', {
      slug_received: slug,
      slug_resolved: frase?.slug ?? null,
      frase_id: frase?.id ?? null,
      found: !!frase,
      ms: Date.now() - started,
    });

    if (!frase?.frase_original?.trim()) {
      notFound(res, slug);
      return;
    }

    sendJson(res, 200, normalizeFraseDetailRecord(frase), { 'Cache-Control': CACHE_HIT });
  } catch (err) {
    console.error('[frase-detail]', {
      slug: slug || '(sem slug)',
      ms: Date.now() - started,
      err,
    });
    notFound(res, slug || '(sem slug)');
  }
}
