import type { AnalyticsEventName, AnalyticsParams } from './events';
import { enrichParams } from './events';
import { getAnalyticsConsent } from './consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

let gaReady = false;

export function markGaReady(): void {
  gaReady = true;
}

export function trackEvent(name: AnalyticsEventName, params?: AnalyticsParams): void {
  if (typeof window === 'undefined') return;
  if (getAnalyticsConsent() === 'denied') return;

  const payload = enrichParams(params);

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload);
    }
  } catch {
    /* ignore */
  }

  try {
    if (typeof window.clarity === 'function') {
      window.clarity('set', 'last_event', name);
      window.clarity('event', name);
    }
  } catch {
    /* ignore */
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, payload);
  }
}

export function trackPageView(path?: string): void {
  if (typeof window === 'undefined' || getAnalyticsConsent() === 'denied') return;
  const pagePath = path ?? window.location.pathname + window.location.search;
  const id = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  if (!id || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_location: window.location.href,
    send_to: id,
  });
}
