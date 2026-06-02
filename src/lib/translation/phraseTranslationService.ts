/**
 * Tradução de frase com cache permanente e modo de contingência quando a API esgota.
 */

import type { SeoLocale } from '../../../lib/i18n/locales';
import { SOURCE_CONTENT_LOCALE } from '../../../lib/i18n/platform';
import { trackTranslationEvent } from '../analytics/translationAnalytics';
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
import { TranslationContingencyError } from './types';

function seoToCard(lang: SeoLocale): CardLang {
  return lang;
}

function resolveSourceLang(text: string): CardLang {
  const det = detectCardLanguageWithConfidence(text);
  if (det.confidence >= 0.45) return seoToCard(det.lang);
  return SOURCE_CONTENT_LOCALE;
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
    const hit = await getPersistedPhraseTranslation(slug, targetLocale, trimmed);
    if (hit?.text) {
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

  try {
    const { translateCardText } = await import('./translationEngine');
    const cardTarget = seoToCard(targetLocale);
    const sourceLang = resolveSourceLang(trimmed);
    const translated = await translateCardText(trimmed, cardTarget, sourceLang, {
      contentId: phraseId,
      force: options?.force,
      skipCache: options?.force,
    });

    clearTranslationApiCooldown();
    await persistPhraseTranslation(slug, targetLocale, trimmed, translated, sourceLang);

    trackTranslationEvent('translation_success', {
      phrase_id: phraseId,
      slug,
      locale: targetLocale,
      mode: 'live',
    });

    return {
      text: translated,
      locale: targetLocale,
      fromCache: false,
      from: sourceLang,
      mode: 'live',
    };
  } catch (err) {
    if (isQuotaOrAvailabilityError(err)) {
      markTranslationApiUnavailable(
        err instanceof Error ? err.message : 'quota'
      );
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
    throw err;
  }
}

export { SOURCE_CONTENT_LOCALE };
