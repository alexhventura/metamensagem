import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { matchSupportedUiLocale, persistUiLocale, resolveUiLocale, uiLocaleFromPathname } from '../lib/uiLocale';
import { readPageTranslatePref } from '../lib/translation/pageTranslateStorage';

function pagePrefToUiLocale(pref: string): string {
  return matchSupportedUiLocale(pref) ?? 'en';
}

/**
 * Sincroniza idioma da INTERFACE (botões, menus) com URL / storage / navegador.
 * Respeita preferência de tradução de página quando não há prefixo SEO na URL.
 */
export function useUiLocaleSync(): void {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const fromPath = uiLocaleFromPathname(pathname);
    if (fromPath) {
      const current = matchSupportedUiLocale(i18n.language);
      if (current !== fromPath) {
        void i18n.changeLanguage(fromPath);
      }
      persistUiLocale(fromPath);
      return;
    }

    const pagePref = readPageTranslatePref();
    if (pagePref) {
      const next = pagePrefToUiLocale(pagePref);
      const current = matchSupportedUiLocale(i18n.language);
      if (current !== next) {
        void i18n.changeLanguage(next);
      }
      return;
    }

    const next = resolveUiLocale(pathname);
    const current = matchSupportedUiLocale(i18n.language);
    if (current !== next) {
      void i18n.changeLanguage(next);
    }
    persistUiLocale(next);
  }, [pathname, i18n]);
}

/** Renderizar dentro de `<BrowserRouter>`. */
export function UiLocaleSync() {
  useUiLocaleSync();
  return null;
}
