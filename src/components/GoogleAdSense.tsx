/**
 * Google AdSense Auto Ads — script global (equivalente a next/script no layout).
 *
 * - Carregamento único (guard por ID no <head>)
 * - async + crossOrigin (script oficial)
 * - Só no cliente (useEffect) → sem hydration mismatch no Vite/React
 * - afterInteractive: agenda após paint via requestIdleCallback / setTimeout
 *
 * Auto Ads não exige <ins> manual; o Google posiciona anúncios automaticamente.
 */

import { useEffect } from 'react';
import { ADSENSE_SCRIPT_ID, ADSENSE_SCRIPT_SRC } from '../lib/adsense';

function injectAdSenseScript(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ADSENSE_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = ADSENSE_SCRIPT_SRC;
  document.head.appendChild(script);
}

export default function GoogleAdSense() {
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) injectAdSenseScript();
    };

    if (typeof requestIdleCallback === 'function') {
      const idleId = requestIdleCallback(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(run, 1);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
