/**
 * Fallback opcional: o script oficial do AdSense está em index.html (head)
 * para o rastreador do Google encontrar o código na primeira resposta HTTP.
 * Este componente só injeta se o script não existir (ex.: ambiente de preview).
 */

import { useEffect } from 'react';
import { ADSENSE_SCRIPT_ID, ADSENSE_SCRIPT_SRC } from '../lib/adsense';

function hasAdSenseScript(): boolean {
  return !!document.querySelector(
    `script#${ADSENSE_SCRIPT_ID}, script[src*="adsbygoogle.js"]`
  );
}

export default function GoogleAdSense() {
  useEffect(() => {
    if (hasAdSenseScript()) return;

    const script = document.createElement('script');
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = ADSENSE_SCRIPT_SRC;
    document.head.appendChild(script);
  }, []);

  return null;
}
