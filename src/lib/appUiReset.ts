/** Fecha modais/popups ao navegar para a home pelo logo do cabeçalho. */

export const MM_RESET_UI_EVENT = 'mm-reset-ui';

export function dispatchAppUiReset(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MM_RESET_UI_EVENT));
}

export function subscribeAppUiReset(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(MM_RESET_UI_EVENT, handler);
  return () => window.removeEventListener(MM_RESET_UI_EVENT, handler);
}
