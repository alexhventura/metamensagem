const CONSENT_KEY = 'mm-analytics-consent';

export type AnalyticsConsent = 'granted' | 'denied';

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof localStorage === 'undefined') return 'granted';
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === 'denied' || v === 'granted') return v;
  } catch {
    /* ignore */
  }
  return 'granted';
}

export function setAnalyticsConsent(value: AnalyticsConsent): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('mm-analytics-consent', { detail: value }));
}
