import { getAnalyticsConsent } from './consent';
import { markGaReady, trackPageView } from './track';

function loadScript(src: string, async = true): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement('script');
  s.src = src;
  s.async = async;
  document.head.appendChild(s);
}

function initGa4(measurementId: string): void {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('consent', 'default', {
    analytics_storage: getAnalyticsConsent() === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    wait_for_update: 500,
  });
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  window.gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure',
  });
  markGaReady();
}

function initClarity(projectId: string): void {
  if (document.querySelector('script[data-mm-clarity]')) return;
  const w = window as Window & { clarity?: (...args: unknown[]) => void };
  w.clarity =
    w.clarity ||
    function clarityStub(...args: unknown[]) {
      (w.clarity as { q?: unknown[] }).q = (w.clarity as { q?: unknown[] }).q || [];
      (w.clarity as { q: unknown[] }).q.push(args);
    };
  const t = document.createElement('script');
  t.async = true;
  t.src = `https://www.clarity.ms/tag/${projectId}`;
  t.setAttribute('data-mm-clarity', '1');
  document.head.appendChild(t);
}

/** Carrega GA4 + Clarity quando IDs estão no build e consentimento permite. */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (getAnalyticsConsent() === 'denied') return;

  const gaId = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim();
  const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim();

  if (gaId) initGa4(gaId);
  if (clarityId) initClarity(clarityId);

  trackPageView();

  window.addEventListener('mm-analytics-consent', () => {
    const consent = getAnalyticsConsent();
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: consent === 'granted' ? 'granted' : 'denied',
      });
    }
    if (consent === 'granted') trackPageView();
  });
}
