import type { CardLang } from './translation/types';
import { detectCardLanguage } from './translation/detect';
import { matchSupportedUiLocale } from './uiLocale';

/**
 * Conteúdo permanece no idioma original. Filtra o feed para priorizar
 * itens cujo texto/título coincide com o idioma da interface (navegador).
 */
export function contentMatchesUiLocale(
  text: string | undefined,
  uiLocale: string | null | undefined
): boolean {
  const loc = matchSupportedUiLocale(uiLocale) ?? 'pt';
  const sample = (text || '').trim();
  if (!sample) return loc === 'pt';
  const detected = detectCardLanguage(sample) as CardLang;
  return detected === loc;
}

/** Ordena: primeiro itens no idioma da UI, depois os demais (mantém original). */
export function prioritizeByUiLocale<T extends { texto?: string; titulo?: string; resumo?: string }>(
  items: T[],
  uiLocale: string | null | undefined
): T[] {
  const loc = matchSupportedUiLocale(uiLocale) ?? 'pt';
  const matched: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const sample = item.texto || item.titulo || item.resumo || '';
    if (contentMatchesUiLocale(sample, loc)) matched.push(item);
    else rest.push(item);
  }
  return [...matched, ...rest];
}
