/**
 * POST /api/translation-request — registra pedido na fila translation_requests.
 * Body: { frase_id, locale }
 */
import { sendJson, type ApiResponse } from './_http.js';
import type { ApiRequest } from './_shared.js';
import { isSeoLocale } from './_shared.js';
import { enqueueTranslationRequest, PENDING_MESSAGE } from './translationRequestService.js';

type Body = { frase_id?: string; locale?: string };

function readBody(req: ApiRequest): Body {
  if (req.body && typeof req.body === 'object') return req.body as Body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Body;
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const body = readBody(req);
  const fraseId = String(body.frase_id ?? '').trim();
  const locale = String(body.locale ?? '').trim();

  if (!fraseId || !locale) {
    sendJson(res, 400, { error: 'frase_id e locale são obrigatórios', registered: false });
    return;
  }

  if (!isSeoLocale(locale)) {
    sendJson(res, 400, { error: 'locale inválido', registered: false });
    return;
  }

  const registered = await enqueueTranslationRequest(fraseId, locale);

  console.info('[translation-request]', {
    frase_id: fraseId,
    locale,
    registered,
  });

  sendJson(res, 200, {
    frase_id: fraseId,
    locale,
    registered,
    status: 'pending',
    message: PENDING_MESSAGE,
  });
}
