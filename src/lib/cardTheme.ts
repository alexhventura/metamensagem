/** Tokens visuais por tipo de conteúdo (borda + acento). */
export type CardAccent = 'purple' | 'pink';

export function cardAccentForTipo(tipo: 'frase' | 'metafora'): CardAccent {
  return tipo === 'metafora' ? 'pink' : 'purple';
}

export function cardBorderGradient(accent: CardAccent): string {
  return accent === 'pink'
    ? 'bg-gradient-to-br from-[#EC4899] to-[#111111]'
    : 'bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6]';
}

export function cardAccentDotClass(accent: CardAccent): string {
  return accent === 'pink' ? 'bg-[#EC4899]' : 'bg-[#A855F7]';
}

export function cardTagClass(accent: CardAccent): string {
  return accent === 'pink'
    ? 'bg-pink-500/5 text-pink-400 border-pink-500/10 hover:bg-pink-500/15'
    : 'bg-purple-500/5 text-purple-400 border border-purple-500/10 hover:bg-purple-500/15';
}

export function cardReadMoreBtnClass(tema: string, accent: CardAccent): string {
  if (accent === 'pink') {
    return tema === 'light'
      ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
      : 'bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20';
  }
  return tema === 'light'
    ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20';
}

/** Mesmas dimensões dos botões Copiar / Compartilhar / Traduzir. */
export const CARD_ACTION_BTN =
  'p-3.5 rounded-2xl transition-all shrink-0 flex items-center justify-center';

export function cardNeutralActionClass(tema: string): string {
  return tema === 'light'
    ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
    : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 border border-white/5';
}

/** Texto da frase em listagens — destaque tipo headline. */
export const FRASE_HEADLINE_CLASS =
  'text-xl md:text-2xl font-black leading-tight tracking-tighter line-clamp-4';

/** Hover do título clicável (metáfora = rosa, frase = roxo). */
export function cardTitleHoverClass(accent: CardAccent): string {
  return accent === 'pink' ? 'hover:text-[#EC4899]' : 'hover:text-[#A855F7]';
}

export function cardTitleColorClass(tema: string): string {
  return tema === 'light' ? 'text-black' : 'text-white';
}

/** Link do título — mesma base para metáforas e frases. */
export function cardTitleLinkClass(
  tema: string,
  accent: CardAccent,
  variant: 'metafora' | 'frase'
): string {
  const size =
    variant === 'frase'
      ? FRASE_HEADLINE_CLASS
      : 'text-xl leading-tight tracking-tighter line-clamp-none';
  return [
    size,
    'font-black transition-colors block mb-3 cursor-pointer',
    cardTitleHoverClass(accent),
    cardTitleColorClass(tema),
  ].join(' ');
}

/** Fundo lavanda (modo leitura) — só página de detalhe da frase, tema claro. */
export const FRASE_DETAIL_INFO_BG_LIGHT = 'bg-[#F3E8FF]';

export function cardImageBtnClass(accent: CardAccent): string {
  return accent === 'pink'
    ? 'p-3.5 bg-[#EC4899] hover:bg-pink-600 text-white rounded-2xl transition-all hover:scale-110 shadow-lg shadow-pink-500/20 shrink-0 flex items-center justify-center'
    : 'p-3.5 bg-[#A855F7] hover:bg-[#9333EA] text-white rounded-2xl transition-all hover:scale-110 shadow-lg shadow-purple-500/20 shrink-0 flex items-center justify-center';
}
