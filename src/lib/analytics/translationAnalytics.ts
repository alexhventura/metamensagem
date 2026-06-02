/**
 * Eventos de tradução (GA4 / Clarity) — falha silenciosa se não houver tag.
 */

export type TranslationAnalyticsEvent =
  | 'translation_requested'
  | 'translation_missing'
  | 'translation_success'
  | 'translation_fallback';

export type TranslationEventParams = {
  phrase_id?: string;
  slug?: string;
  locale?: string;
  category?: string;
  country?: string;
  mode?: 'live' | 'cached' | 'contingency';
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (action: string, ...args: unknown[]) => void;
  }
}

export function trackTranslationEvent(
  name: TranslationAnalyticsEvent,
  params?: TranslationEventParams
): void {
  if (typeof window === 'undefined') return;

  const payload = {
    event_category: 'translation',
    ...params,
  };

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload);
    }
  } catch {
    /* ignore */
  }

  try {
    if (typeof window.clarity === 'function') {
      window.clarity('event', name, JSON.stringify(payload));
    }
  } catch {
    /* ignore */
  }

  if (import.meta.env?.DEV) {
    console.debug('[translation-analytics]', name, payload);
  }
}
