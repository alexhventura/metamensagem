/**
 * GET /api/frase-detail?slug=... — detalhe da frase (Supabase + shard CDN).
 */

import { normalizeFraseDetailRecord } from './_fraseDetailLookup.js';
import { requestUrl, sendJson, type ApiResponse } from './_http.js';
import type { ApiRequest } from './_shared.js';
import { resolveFraseDetailBySlug } from './fraseDetailService.js';

const CACHE_HIT = 'public, max-age=86400, stale-while-revalidate=604800';
const CACHE_MISS = 'public, max-age=300';

function logFraseDetail(
  level: 'info' | 'error',
  payload: Record<string, unknown>
): void {
  const line = { event: 'frase-detail', ...payload };
  if (level === 'error') console.error('[frase-detail]', line);
  else console.log('[frase-detail]', line);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function errorStack(err: unknown): string | undefined {
  return err instanceof Error ? err.stack : undefined;
}

function safeDecodeSlug(raw: string | null): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw).toLowerCase().trim();
  } catch {
    return raw.toLowerCase().trim();
  }
}

function notFound(res: ApiResponse, slug: string): void {
  try {
    sendJson(
      res,
      404,
      { slug, found: false, message: 'Frase não encontrada' },
      { 'Cache-Control': CACHE_MISS }
    );
  } catch (err) {
    logFraseDetail('error', {
      slug_received: slug,
      step: 'notFound_send',
      error_message: errorMessage(err),
      stack: errorStack(err),
    });
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const started = Date.now();
  let slug = '';
  let step = 'init';

  try {
    if (req.method !== 'GET') {
      step = 'method_check';
      sendJson(res, 405, { error: 'Method not allowed', found: false });
      return;
    }

    step = 'parse_url';
    const url = requestUrl(req);
    slug = safeDecodeSlug(url.searchParams.get('slug'));

    if (!slug) {
      step = 'validate_slug';
      sendJson(res, 400, { error: 'slug required', found: false });
      return;
    }

    step = 'resolve';
    const frase = await resolveFraseDetailBySlug(slug, url.origin);

    if (!frase?.frase_original?.trim()) {
      step = 'not_found';
      logFraseDetail('info', {
        slug_received: slug,
        step,
        found: false,
        execution_ms: Date.now() - started,
      });
      notFound(res, slug);
      return;
    }

    step = 'normalize';
    let payload;
    try {
      payload = normalizeFraseDetailRecord(frase);
    } catch (normErr) {
      logFraseDetail('error', {
        slug_received: slug,
        step: 'normalize',
        error_message: errorMessage(normErr),
        stack: errorStack(normErr),
        execution_ms: Date.now() - started,
      });
      notFound(res, slug);
      return;
    }

    step = 'send_ok';
    sendJson(res, 200, payload, { 'Cache-Control': CACHE_HIT });
    logFraseDetail('info', {
      slug_received: slug,
      slug_resolved: payload.slug,
      frase_id: payload.id,
      step,
      found: true,
      execution_ms: Date.now() - started,
    });
  } catch (err) {
    logFraseDetail('error', {
      slug_received: slug || '(sem slug)',
      step,
      error_message: errorMessage(err),
      stack: errorStack(err),
      execution_ms: Date.now() - started,
    });
    notFound(res, slug || '(sem slug)');
  }
}
