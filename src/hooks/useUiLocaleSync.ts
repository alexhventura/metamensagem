import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { matchSupportedUiLocale, persistUiLocale, resolveUiLocale } from '../lib/uiLocale';

/**
 * Sincroniza idioma da INTERFACE (botões, menus) com URL / storage / navegador.
 * Não altera o idioma do conteúdo das frases nos cards.
 */
export function useUiLocaleSync(): void {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
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
