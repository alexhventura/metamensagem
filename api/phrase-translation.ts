/**
 * POST /api/phrase-translation — cache global Supabase + MyMemory (último recurso).
 * Body: { frase_id, locale, source_text, force? }
 */
import { sendJson, type ApiResponse } from './_http.js';
import type { ApiRequest } from './_shared.js';
import { isSeoLocale } from './_shared.js';
import { resolvePhraseTranslation } from './phraseTranslationService.js';

const CACHE_HIT = 'public, max-age=86400, stale-while-revalidate=604800';
const CACHE_MISS = 'public, max-age=60';

type PhraseTranslationBody = {
  frase_id?: string;
  locale?: string;
  source_text?: string;
  force?: boolean;
};

function readBody(req: ApiRequest): PhraseTranslationBody {
  if (req.body && typeof req.body === 'object') {
    return req.body as PhraseTranslationBody;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as PhraseTranslationBody;
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
  const sourceText = String(body.source_text ?? '').trim();

  if (!fraseId || !locale || !sourceText) {
    sendJson(res, 400, { error: 'frase_id, locale e source_text são obrigatórios', found: false });
    return;
  }

  if (!isSeoLocale(locale)) {
    sendJson(res, 400, { error: 'locale inválido', found: false });
    return;
  }

  try {
    const result = await resolvePhraseTranslation({
      fraseId,
      locale,
      sourceText,
      force: body.force === true,
    });

    sendJson(
      res,
      200,
      {
        frase_id: fraseId,
        locale,
        found: true,
        text: result.text,
        from_cache: result.fromCache,
        locale_origem: result.localeOrigem,
      },
      { 'Cache-Control': result.fromCache ? CACHE_HIT : CACHE_MISS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tradução indisponível';
    const quota = /quota|cota|429/i.test(message);
    sendJson(
      res,
      quota ? 429 : 503,
      { frase_id: fraseId, locale, found: false, error: message },
      { 'Cache-Control': CACHE_MISS }
    );
  }
}
