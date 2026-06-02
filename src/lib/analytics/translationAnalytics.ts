import { trackEvent } from './track';
import type { AnalyticsEventName } from './events';
import type { AnalyticsParams } from './events';

export type TranslationAnalyticsEvent = Extract<
  AnalyticsEventName,
  'translation_requested' | 'translation_missing' | 'translation_success' | 'translation_fallback'
>;

export function trackTranslationEvent(
  name: TranslationAnalyticsEvent,
  params?: AnalyticsParams
): void {
  trackEvent(name, params);
}
