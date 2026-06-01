/**
 * AdSense não bloqueia o primeiro paint — script via idle + slots (AdSlot).
 * Mantém meta de verificação: o publisher ID permanece em adsense.ts.
 */

import { useEffect } from 'react';
import { loadAdSenseWhenIdle } from '../lib/adsenseLazy';

export default function GoogleAdSense() {
  useEffect(() => {
    loadAdSenseWhenIdle();
  }, []);
  return null;
}
