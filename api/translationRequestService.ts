/**
 * Fila persistente translation_requests — enqueue, processamento em lote (cron).
 */
import { getServerSupabaseServiceRole } from './_supabaseServer.js';
import { isSeoLocale } from './_shared.js';
import {
  lookupPhraseTranslation,
  translateWithMyMemory,
  upsertPhraseTranslation,
} from './phraseTranslationService.js';

export const PENDING_MESSAGE =
  'Esta tradução foi solicitada e será processada automaticamente.';

export class TranslationPendingError extends Error {
  constructor(message = PENDING_MESSAGE) {
    super(message);
    this.name = 'TranslationPendingError';
  }
}

export async function enqueueTranslationRequest(
  fraseId: string,
  locale: string
): Promise<boolean> {
  if (!isSeoLocale(locale)) return false;

  const sb = getServerSupabaseServiceRole();
  if (!sb) return false;

  const { error } = await sb.rpc('mm_enqueue_translation_request', {
    p_frase_id: fraseId,
    p_locale: locale,
  });

  if (error) {
    console.error('[translation-requests] enqueue', fraseId, locale, error.message);
    return false;
  }
  return true;
}

type PendingRow = {
  frase_id: string;
  locale: string;
  request_count: number;
};

export type ProcessTranslationRequestsResult = {
  fetched: number;
  completed: number;
  skipped: number;
  failed: number;
};

const CRON_BATCH_LIMIT = 25;
const CRON_DELAY_MS = 180;

function detectSourceLocale(text: string): string {
  if (/[áàâãéêíóôõúç]/i.test(text)) return 'pt';
  if (/[ñ¿¡]/i.test(text) || /\b(el|la|los|que|por|para)\b/i.test(text)) return 'es';
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(text)) return 'ja';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

async function markRequestCompleted(fraseId: string, locale: string): Promise<void> {
  const sb = getServerSupabaseServiceRole();
  if (!sb) return;

  await sb
    .from('translation_requests')
    .update({
      status: 'completed',
      last_attempt: new Date().toISOString(),
    })
    .eq('frase_id', fraseId)
    .eq('locale', locale);
}

async function touchRequestAttempt(fraseId: string, locale: string): Promise<void> {
  const sb = getServerSupabaseServiceRole();
  if (!sb) return;

  await sb
    .from('translation_requests')
    .update({ last_attempt: new Date().toISOString() })
    .eq('frase_id', fraseId)
    .eq('locale', locale)
    .eq('status', 'pending');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processPendingTranslationRequests(
  limit = CRON_BATCH_LIMIT
): Promise<ProcessTranslationRequestsResult> {
  const sb = getServerSupabaseServiceRole();
  if (!sb) {
    throw new Error('Supabase service role não configurada');
  }

  const { data: rows, error } = await sb
    .from('translation_requests')
    .select('frase_id, locale, request_count')
    .eq('status', 'pending')
    .order('request_count', { ascending: false })
    .order('requested_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const requests = (rows ?? []) as PendingRow[];
  const result: ProcessTranslationRequestsResult = {
    fetched: requests.length,
    completed: 0,
    skipped: 0,
    failed: 0,
  };

  for (let i = 0; i < requests.length; i++) {
    const row = requests[i];
    const { frase_id: fraseId, locale } = row;

    if (!isSeoLocale(locale)) {
      result.skipped++;
      continue;
    }

    const { data: frase, error: fraseErr } = await sb
      .from('frases')
      .select('frase_original, language_original')
      .eq('id', fraseId)
      .maybeSingle();

    if (fraseErr || !frase?.frase_original?.trim()) {
      result.skipped++;
      await touchRequestAttempt(fraseId, locale);
      continue;
    }

    const sourceText = String(frase.frase_original).trim();
    const cached = await lookupPhraseTranslation(fraseId, locale, sourceText);
    if (cached) {
      await markRequestCompleted(fraseId, locale);
      result.completed++;
      continue;
    }

    const localeOrigem =
      frase.language_original && isSeoLocale(String(frase.language_original))
        ? String(frase.language_original)
        : detectSourceLocale(sourceText);

    if (localeOrigem === locale) {
      await upsertPhraseTranslation({
        fraseId,
        locale,
        sourceText,
        translatedText: sourceText,
        localeOrigem,
      });
      await markRequestCompleted(fraseId, locale);
      result.completed++;
      continue;
    }

    try {
      const translated = await translateWithMyMemory(sourceText, localeOrigem, locale);
      const saved = await upsertPhraseTranslation({
        fraseId,
        locale,
        sourceText,
        translatedText: translated,
        localeOrigem,
      });
      if (!saved) {
        result.failed++;
        await touchRequestAttempt(fraseId, locale);
        continue;
      }
      await markRequestCompleted(fraseId, locale);
      result.completed++;
    } catch (err) {
      console.warn(
        '[translation-requests] translate failed',
        fraseId,
        locale,
        err instanceof Error ? err.message : err
      );
      result.failed++;
      await touchRequestAttempt(fraseId, locale);
    }

    if (i < requests.length - 1) {
      await sleep(CRON_DELAY_MS);
    }
  }

  return result;
}
