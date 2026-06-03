/**
 * GET /api/frase-detail?slug=... — detalhe da frase (Supabase + shard CDN).
 */
import { normalizeFraseDetailRecord } from '../lib/frases/detailLookup.js';
import { requestUrl, sendJson, type ApiResponse } from './_http.js';
import type { ApiRequest } from './_shared.js';
import { resolveFraseDetailBySlug } from './fraseDetailService.js';

const CACHE = 'public, max-age=31536000, immutable';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let slug = '';
  try {
    const url = requestUrl(req);
    slug = decodeURIComponent(url.searchParams.get('slug') ?? '').toLowerCase().trim();

    if (!slug) {
      sendJson(res, 400, { error: 'slug required', found: false });
      return;
    }

    const frase = await resolveFraseDetailBySlug(slug, url.origin);

    if (!frase) {
      sendJson(res, 404, { slug, found: false, message: 'Frase não encontrada' });
      return;
    }

    sendJson(res, 200, normalizeFraseDetailRecord(frase), { 'Cache-Control': CACHE });
  } catch (err) {
    console.error('[frase-detail]', slug || '(sem slug)', err);
    sendJson(res, 404, {
      slug: slug || undefined,
      found: false,
      message: 'Frase não encontrada',
    });
  }
}
