/**
 * Tradução de frase com cache permanente e modo de contingência quando a API esgota.
 */

import type { SeoLocale } from '../../../lib/i18n/locales';
import { SOURCE_CONTENT_LOCALE } from '../../../lib/i18n/platform';
import { trackTranslationEvent } from '../analytics/translationAnalytics';
import { recordTranslationHit, recordTranslationLatency } from '../observability/performanceMetrics';
import { queueFraseMetricIncrement } from '../analytics/fraseMetricsSync';
import {
  getPersistedPhraseTranslation,
  persistPhraseTranslation,
} from './persistentStore';
import { detectCardLanguageWithConfidence } from './detect';
import { recordTranslationDemand } from './translationDemand';
import {
  clearTranslationApiCooldown,
  isLiveTranslationEnabled,
  isQuotaOrAvailabilityError,
  markTranslationApiUnavailable,
} from './translationQuota';
import type { CardLang, PhraseTranslationMode } from './types';
import { TranslationContingencyError, TranslationPendingError } from './types';

function seoToCard(lang: SeoLocale): CardLang {
  return lang;
}

function resolveSourceLang(text: string): CardLang {
  const det = detectCardLanguageWithConfidence(text);
  if (det.confidence >= 0.45) return seoToCard(det.lang);
  return SOURCE_CONTENT_LOCALE;
}

export function isFraseIdFormat(value: string | undefined | null): boolean {
  const v = String(value ?? '').trim();
  if (!v) return false;
  return /^f_/i.test(v) || (v.length >= 12 && /^[a-z0-9_-]+$/i.test(v));
}

function isLikelyFraseId(value: string, slug: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (isFraseIdFormat(v)) return true;
  if (v === slug) return false;
  return v.length >= 8;
}

function resolveFraseId(contentId: string | undefined, slug: string): string | undefined {
  const id = contentId?.trim();
  if (id && isFraseIdFormat(id)) return id;
  const candidate = (id || slug).trim();
  if (isLikelyFraseId(candidate, slug)) return candidate;
  return undefined;
}

async function registerTranslationRequest(fraseId: string, locale: SeoLocale): Promise<void> {
  try {
    await fetch('/api/translation-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frase_id: fraseId, locale }),
    });
  } catch {
    /* offline */
  }
}

function logTranslationFailure(
  step: string,
  input: { fraseId?: string; slug: string; locale: SeoLocale },
  err: unknown,
  httpStatus?: number
): void {
  if (!import.meta.env.DEV) return;
  console.warn('[phraseTranslation]', {
    step,
    frase_id: input.fraseId,
    slug: input.slug,
    locale: input.locale,
    http_status: httpStatus,
    error_message: err instanceof Error ? err.message : String(err),
  });
}

async function fetchGlobalPhraseTranslation(input: {
  fraseId: string;
  slug: string;
  sourceText: string;
  targetLocale: SeoLocale;
  force?: boolean;
}): Promise<{ text: string; fromCache: boolean; localeOrigem: SeoLocale }> {
  const res = await fetch('/api/phrase-translation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frase_id: input.fraseId,
      locale: input.targetLocale,
      source_text: input.sourceText,
      force: input.force === true,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    text?: string;
    from_cache?: boolean;
    locale_origem?: string;
    status?: string;
    message?: string;
    error?: string;
  };

  if (import.meta.env.DEV) {
    console.info('[phraseTranslation] api', {
      frase_id: input.fraseId,
      slug: input.slug,
      locale: input.targetLocale,
      http_status: res.status,
      status: payload.status,
      from_cache: payload.from_cache,
      provider: payload.from_cache ? 'supabase' : res.ok && payload.text ? 'mymemory' : undefined,
    });
  }

  if (payload.status === 'pending') {
    throw new TranslationPendingError(
      payload.message ||
        'Esta tradução foi solicitada e será processada automaticamente.',
      input.targetLocale
    );
  }

  if (!res.ok) {
    logTranslationFailure('api_error', input, payload.error || res.status, res.status);
    throw new Error(payload.error || `HTTP ${res.status}`);
  }

  const text = payload.text?.trim();
  if (!text) throw new Error('Tradução vazia');

  const localeOrigem = (payload.locale_origem as SeoLocale) || resolveSourceLang(input.sourceText);
  return { text, fromCache: payload.from_cache === true, localeOrigem };
}

export type PhraseTranslationResult = {
  text: string;
  locale: SeoLocale;
  fromCache: boolean;
  from: SeoLocale;
  mode: PhraseTranslationMode;
};

export type PhraseTranslationOptions = {
  force?: boolean;
  contentId?: string;
  category?: string;
};

/** Obtém tradução oficial, tradução ao vivo (se API ok) ou dispara contingência. */
export async function getOrCreatePhraseTranslation(
  slug: string,
  sourceText: string,
  targetLocale: SeoLocale,
  options?: PhraseTranslationOptions
): Promise<PhraseTranslationResult> {
  const trimmed = sourceText.trim();
  const fraseId = resolveFraseId(options?.contentId, slug);
  const phraseId = options?.contentId ?? slug;

  if (!trimmed) {
    return {
      text: '',
      locale: targetLocale,
      fromCache: true,
      from: SOURCE_CONTENT_LOCALE,
      mode: 'cached',
    };
  }

  if (targetLocale === SOURCE_CONTENT_LOCALE) {
    return {
      text: trimmed,
      locale: SOURCE_CONTENT_LOCALE,
      fromCache: true,
      from: SOURCE_CONTENT_LOCALE,
      mode: 'cached',
    };
  }

  if (!options?.force) {
    const hit = await getPersistedPhraseTranslation(slug, targetLocale, trimmed, fraseId);
    if (hit?.text) {
      recordTranslationHit(true);
      trackTranslationEvent('translation_success', {
        phrase_id: phraseId,
        slug,
        locale: targetLocale,
        mode: 'cached',
      });
      return {
        text: hit.text,
        locale: targetLocale,
        fromCache: true,
        from: hit.from,
        mode: 'cached',
      };
    }
  }

  if (!isLiveTranslationEnabled()) {
    recordTranslationDemand({
      phraseId,
      slug,
      locale: targetLocale,
      category: options?.category,
    });
    trackTranslationEvent('translation_fallback', {
      phrase_id: phraseId,
      slug,
      locale: targetLocale,
      mode: 'contingency',
    });
    throw new TranslationContingencyError(
      'Tradução em tempo real indisponível',
      seoToCard(targetLocale),
      false
    );
  }

  trackTranslationEvent('translation_requested', {
    phrase_id: phraseId,
    slug,
    locale: targetLocale,
    mode: 'live',
  });

  const translateStarted = performance.now();

  try {
    let translated: string;
    let sourceLang: SeoLocale;
    let fromCache = false;

    if (fraseId) {
      const global = await fetchGlobalPhraseTranslation({
        fraseId,
        slug,
        sourceText: trimmed,
        targetLocale,
        force: options?.force,
      });
      translated = global.text;
      sourceLang = global.localeOrigem;
      fromCache = global.fromCache;
      clearTranslationApiCooldown();
    } else {
      const { translateCardText } = await import('./translationEngine');
      const cardTarget = seoToCard(targetLocale);
      sourceLang = resolveSourceLang(trimmed);
      translated = await translateCardText(trimmed, cardTarget, sourceLang, {
        contentId: phraseId,
        force: options?.force,
        skipCache: options?.force,
      });
      clearTranslationApiCooldown();
    }

    await persistPhraseTranslation(slug, targetLocale, trimmed, translated, sourceLang, fraseId);

    trackTranslationEvent('translation_success', {
      phrase_id: phraseId,
      slug,
      locale: targetLocale,
      mode: fromCache ? 'cached' : 'live',
    });
    recordTranslationHit(true);
    recordTranslationLatency(performance.now() - translateStarted, true);

    return {
      text: translated,
      locale: targetLocale,
      fromCache,
      from: sourceLang,
      mode: fromCache ? 'cached' : 'live',
    };
  } catch (err) {
    recordTranslationLatency(performance.now() - translateStarted, false);
    if (err instanceof TranslationPendingError) {
      recordTranslationHit(false);
      queueFraseMetricIncrement('translation_requests', slug, fraseId);
      if (fraseId) void registerTranslationRequest(fraseId, targetLocale);
      trackTranslationEvent('translation_fallback', {
        phrase_id: phraseId,
        slug,
        locale: targetLocale,
        mode: 'pending',
      });
      throw err;
    }
    if (isQuotaOrAvailabilityError(err)) {
      recordTranslationHit(false);
      markTranslationApiUnavailable(err instanceof Error ? err.message : 'quota');
      recordTranslationDemand({
        phraseId,
        slug,
        locale: targetLocale,
        category: options?.category,
      });
      if (fraseId) void registerTranslationRequest(fraseId, targetLocale);
      trackTranslationEvent('translation_fallback', {
        phrase_id: phraseId,
        slug,
        locale: targetLocale,
        mode: 'contingency',
      });
      throw new TranslationContingencyError(
        'Tradução em tempo real indisponível',
        seoToCard(targetLocale),
        false
      );
    }
    if (fraseId) {
      logTranslationFailure('fallback_pending', { fraseId, slug, locale: targetLocale }, err);
      recordTranslationHit(false);
      recordTranslationDemand({
        phraseId,
        slug,
        locale: targetLocale,
        category: options?.category,
      });
      void registerTranslationRequest(fraseId, targetLocale);
      queueFraseMetricIncrement('translation_requests', slug, fraseId);
      trackTranslationEvent('translation_fallback', {
        phrase_id: phraseId,
        slug,
        locale: targetLocale,
        mode: 'pending',
      });
      throw new TranslationPendingError(
        'Esta frase ainda não possui tradução disponível. Seu pedido foi registrado e a tradução será preparada automaticamente.',
        seoToCard(targetLocale)
      );
    }
    throw err;
  }
}

export { SOURCE_CONTENT_LOCALE };
