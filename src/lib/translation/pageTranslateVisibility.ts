import type { CardLang } from './types';
import { pageLanguageNativeName } from './pageLanguages';

/** Exibe tradução apenas quando o conteúdo principal não está em português. */
export function shouldShowPageTranslate(contentLang?: CardLang): boolean {
  return !!contentLang && contentLang !== 'pt';
}

/** Idioma sugerido no modal — português para visitantes do acervo BR. */
export function defaultPageTranslateTarget(contentLang?: CardLang): CardLang {
  if (contentLang && contentLang !== 'pt') return 'pt';
  return 'pt';
}

export function pageTranslateButtonShortLabel(
  contentLang: CardLang | undefined,
  activeTarget: CardLang | null
): string {
  if (activeTarget) {
    return `🌎 ${pageLanguageNativeName(activeTarget)}`;
  }
  if (contentLang && contentLang !== 'pt') {
    return '🌎 Ler em Português';
  }
  return '🌎 Traduzir página';
}

export function pageTranslateButtonAriaLabel(
  contentLang: CardLang | undefined,
  activeTarget: CardLang | null
): string {
  if (activeTarget) {
    return `Idioma ativo: ${pageLanguageNativeName(activeTarget)}. Alterar tradução.`;
  }
  if (contentLang && contentLang !== 'pt') {
    return 'Traduzir página para português';
  }
  return 'Traduzir página';
}
