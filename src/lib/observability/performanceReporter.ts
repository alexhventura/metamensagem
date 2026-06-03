/**
 * Exporta métricas operacionais (DEV: console + window.__mmPerf).
 */

import { performanceSnapshot } from './performanceMetrics';

declare global {
  interface Window {
    __mmPerf?: () => ReturnType<typeof performanceSnapshot>;
  }
}

let started = false;

export function startPerformanceReporter(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.__mmPerf = performanceSnapshot;

  const log = () => {
    if (!import.meta.env.DEV) return;
    const snap = performanceSnapshot();
    if (
      snap.cache_hit_memory +
        snap.cache_hit_indexeddb +
        snap.cache_hit_cdn +
        snap.cache_hit_supabase +
        snap.cache_miss <
      1
    ) {
      return;
    }
    console.info('[mm-perf]', snap);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') log();
  });

  setInterval(log, 120_000);
}
