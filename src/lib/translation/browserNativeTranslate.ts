import type { CardLang } from './types';
import { browserPreferredPageLang } from './pageTranslateStorage';

const CHROME_TRANSLATED = /(?:^|\s)translated-(?:ltr|rtl)(?:\s|$)/;
const EVENT_NAME = 'mm-browser-native-translate';

export type BrowserNativeTranslateState = {
  active: boolean;
  /** Melhor palpite do idioma-alvo (navegador). */
  inferredLang: CardLang | null;
};

export function readBrowserNativeTranslateState(): BrowserNativeTranslateState {
  if (typeof document === 'undefined') {
    return { active: false, inferredLang: null };
  }
  const html = document.documentElement;
  const className = html.className || '';
  /** Chrome/Edge: classe `translated-ltr` / `translated-rtl` no <html>. */
  const byClass = CHROME_TRANSLATED.test(className);
  /** Chrome/Edge: widget `#goog-gt-tt` enquanto a tradução está ativa. */
  const byWidget = Boolean(document.getElementById('goog-gt-tt'));
  /**
   * Safari / Edge legado: sinais extras além de translated-* / goog-gt-tt.
   * Não usa só `lang` (o app muda lang em páginas de detalhe).
   */
  const orig = (html.dataset.mmOrigLang || '').toLowerCase().split('-')[0];
  const docLang = (html.getAttribute('lang') || '').toLowerCase().split('-')[0];
  const byLangDrift =
    Boolean(orig) &&
    Boolean(docLang) &&
    docLang !== orig &&
    (html.hasAttribute('_msttexthash') ||
      Boolean(document.querySelector('font[style*="vertical-align"]')));

  const active = byClass || byWidget || byLangDrift;
  return {
    active,
    inferredLang: active ? browserPreferredPageLang() : null,
  };
}

/** Marca o idioma original da página (pt) para detectar mudança do Safari. */
export function markDocumentOriginalLang(): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (!html.dataset.mmOrigLang) {
    html.dataset.mmOrigLang = (html.getAttribute('lang') || 'pt').toLowerCase().split('-')[0];
  }
}

export function dispatchBrowserNativeTranslate(state: BrowserNativeTranslateState): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: state }));
}

export const BROWSER_NATIVE_TRANSLATE_EVENT = EVENT_NAME;
