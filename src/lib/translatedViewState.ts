/** Estado global da visualização traduzida (UX) — usado por SEO meta e noindex. */
let translatedViewActive = false;

export function setTranslatedViewActive(active: boolean): void {
  translatedViewActive = active;
  if (typeof document === 'undefined') return;
  if (active) {
    document.documentElement.dataset.mmTranslated = '1';
  } else {
    delete document.documentElement.dataset.mmTranslated;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('mm-translated-view-change', { detail: { active } })
    );
  }
}

export function isTranslatedViewActive(): boolean {
  return translatedViewActive;
}
