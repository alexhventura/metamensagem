export { initAnalytics } from './initAnalytics';
export { trackEvent, trackPageView } from './track';
export { trackPhraseEvent, getTopPhraseSlugs, popularityScore } from './phrasePopularity';
export { trackTranslationEvent } from './translationAnalytics';
export { trackImageGenerate } from './imageAnalytics';
export { getAnalyticsConsent, setAnalyticsConsent } from './consent';
export type { AnalyticsEventName, AnalyticsParams } from './events';
