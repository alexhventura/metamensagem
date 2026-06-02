/**
 * AdSense: carrega script só quando slot entra na viewport ou thread ociosa.
 */

import { ADSENSE_SCRIPT_ID, ADSENSE_SCRIPT_SRC } from './adsense';

let loadPromise: Promise<void> | null = null;
let observer: IntersectionObserver | null = null;

function injectScript(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script#${ADSENSE_SCRIPT_ID}, script[src*="adsbygoogle.js"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = ADSENSE_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('AdSense script failed'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/** Apenas slots visíveis disparam o script — sem carga global no primeiro paint. */
export function loadAdSenseWhenIdle(): void {
  /* intencionalmente vazio: use observeAdSlot */
}

export function observeAdSlot(el: HTMLElement): () => void {
  const trigger = () => {
    injectScript().catch(() => {});
  };

  if ('IntersectionObserver' in window) {
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              trigger();
              observer?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: '0px 0px 120px 0px', threshold: 0.05 }
      );
    }
    observer.observe(el);
    return () => observer?.unobserve(el);
  }

  const t = setTimeout(trigger, 3000);
  return () => clearTimeout(t);
}
