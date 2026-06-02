/**
 * Volta no histórico do navegador com fallback seguro (SPA + entrada direta).
 */
export function safeHistoryBack(fallbackPath = '/'): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
  } catch {
    /* ignore */
  }
  window.location.assign(fallbackPath);
}
