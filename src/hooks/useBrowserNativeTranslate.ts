import { useEffect, useRef, useState } from 'react';
import {
  BROWSER_NATIVE_TRANSLATE_EVENT,
  dispatchBrowserNativeTranslate,
  markDocumentOriginalLang,
  readBrowserNativeTranslateState,
  type BrowserNativeTranslateState,
} from '../lib/translation/browserNativeTranslate';

/**
 * Observa a tradução nativa do Chrome/Edge/Safari (classe translated-ltr/rtl, widget, lang).
 * Dispara evento global para o PageTranslateProvider e botões dos cards.
 */
export function useBrowserNativeTranslate(): BrowserNativeTranslateState {
  const [state, setState] = useState<BrowserNativeTranslateState>({
    active: false,
    inferredLang: null,
  });
  const lastActive = useRef(false);

  useEffect(() => {
    markDocumentOriginalLang();

    const publish = () => {
      const next = readBrowserNativeTranslateState();
      const changed = next.active !== lastActive.current;
      lastActive.current = next.active;
      setState(next);
      if (changed) {
        dispatchBrowserNativeTranslate(next);
      }
    };

    publish();

    const obs = new MutationObserver(publish);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'lang'],
    });

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<BrowserNativeTranslateState>).detail;
      if (detail) setState(detail);
    };
    window.addEventListener(BROWSER_NATIVE_TRANSLATE_EVENT, onCustom);

    /** Poll leve: o widget do Google pode aparecer sem mudar a classe do <html>. */
    const poll = window.setInterval(publish, 1200);

    return () => {
      obs.disconnect();
      window.removeEventListener(BROWSER_NATIVE_TRANSLATE_EVENT, onCustom);
      window.clearInterval(poll);
    };
  }, []);

  return state;
}
