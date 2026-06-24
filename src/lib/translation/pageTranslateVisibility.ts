import { pageLanguageNativeName } from './pageLanguages';
import type { CardLang } from './types';

/** Botão de tradução sempre disponível — padronização por idioma do visitante. */
export function shouldShowPageTranslate(): boolean {
  return true;
}

export function pageTranslateButtonShortLabel(activeTarget: CardLang | null): string {
  if (activeTarget) {
    return pageLanguageNativeName(activeTarget);
  }
  return 'Traduzir página';
}

export function pageTranslateButtonAriaLabel(activeTarget: CardLang | null): string {
  if (activeTarget) {
    return `Idioma ativo: ${pageLanguageNativeName(activeTarget)}. Alterar tradução.`;
  }
  return 'Traduzir página inteira';
}
