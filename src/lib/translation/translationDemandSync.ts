/**
 * Sincroniza fila local de demanda com /api/translation-demand (debounce + keepalive).
 */

import { exportTranslationDemandForCi } from './translationDemand';

const SYNC_DEBOUNCE_MS = 4_000;
const LAST_SENT_KEY = 'mm-translation-demand-last-sent';

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function fingerprint(): string {
  return JSON.stringify(exportTranslationDemandForCi());
}

export function scheduleTranslationDemandSync(): void {
  if (typeof window === 'undefined') return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void flushTranslationDemandSync();
  }, SYNC_DEBOUNCE_MS);
}

export async function flushTranslationDemandSync(): Promise<boolean> {
  if (typeof window === 'undefined' || flushing) return false;
  const payload = exportTranslationDemandForCi();
  if (!Object.keys(payload.queue).length) return false;

  const fp = fingerprint();
  try {
    if (sessionStorage.getItem(LAST_SENT_KEY) === fp) return true;
  } catch {
    /* ignore */
  }

  flushing = true;
  try {
    const res = await fetch('/api/translation-demand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue: payload.queue, meta: payload.meta }),
      keepalive: true,
    });
    if (res.ok) {
      try {
        sessionStorage.setItem(LAST_SENT_KEY, fp);
      } catch {
        /* ignore */
      }
      return true;
    }
  } catch {
    /* offline */
  } finally {
    flushing = false;
  }
  return false;
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushTranslationDemandSync();
  });
  window.addEventListener('pagehide', () => void flushTranslationDemandSync());
}
