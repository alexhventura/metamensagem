/**
 * Diagnóstico LCP — apenas em desenvolvimento (custo zero).
 */

export function initLcpObserver(): void {
  if (!import.meta.env.DEV) return;
  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const po = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const e = entry as PerformanceEntry & { element?: Element };
        console.warn(
          '[LCP]',
          e.element,
          `time=${Math.round(entry.startTime)}ms`,
          `route=${window.location.pathname}`
        );
      }
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    /* unsupported */
  }
}
