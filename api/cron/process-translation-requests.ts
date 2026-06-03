/**
 * GET /api/cron/process-translation-requests — processa fila translation_requests.
 * Disparado pelo Vercel Cron (ver vercel.json). Requer CRON_SECRET.
 */
import { sendJson, type ApiResponse } from '../_http.js';
import type { ApiRequest } from '../_shared.js';
import { processPendingTranslationRequests } from '../translationRequestService.js';

function readAuthHeader(req: ApiRequest): string | null {
  const headers = req.headers;
  if (!headers) return null;
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get('authorization');
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const raw = record.authorization ?? record.Authorization;
  return Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
}

function isAuthorized(req: ApiRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';

  return readAuthHeader(req) === `Bearer ${secret}`;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  try {
    const result = await processPendingTranslationRequests();
    sendJson(res, 200, { ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao processar fila';
    console.error('[cron/process-translation-requests]', message);
    sendJson(res, 500, { ok: false, error: message });
  }
}
