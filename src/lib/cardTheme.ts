/** Tokens visuais por tipo de conteúdo — estilo suave para leitura prolongada. */
export type CardAccent = 'purple' | 'pink';

export function cardAccentForTipo(tipo: 'frase' | 'metafora'): CardAccent {
  return tipo === 'metafora' ? 'pink' : 'purple';
}

/** Borda sutil no acento (sem gradiente pesado). */
export function cardBorderSoft(accent: CardAccent, tema = 'dark'): string {
  if (tema === 'light') {
    return accent === 'pink' ? 'border-pink-200/80' : 'border-purple-200/80';
  }
  return accent === 'pink' ? 'border-pink-500/20' : 'border-purple-500/20';
}

/** @deprecated Prefer cardBorderSoft — mantido para compatibilidade. */
export function cardBorderGradient(accent: CardAccent): string {
  return accent === 'pink'
    ? 'border border-pink-500/25'
    : 'border border-purple-500/25';
}

export function cardAccentDotClass(accent: CardAccent): string {
  return accent === 'pink' ? 'bg-[#EC4899]/80' : 'bg-[#A855F7]/80';
}

export function cardTagClass(accent: CardAccent, tema = 'dark'): string {
  if (tema === 'light') {
    return accent === 'pink'
      ? 'bg-pink-50 text-pink-700 border-pink-100 hover:bg-pink-100/80'
      : 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100/80';
  }
  return accent === 'pink'
    ? 'bg-pink-500/10 text-pink-300/90 border-pink-500/15 hover:bg-pink-500/15'
    : 'bg-purple-500/10 text-purple-300/90 border-purple-500/15 hover:bg-purple-500/15';
}

export function cardReadMoreBtnClass(tema: string, accent: CardAccent): string {
  if (accent === 'pink') {
    return tema === 'light'
      ? 'text-pink-600 hover:text-pink-700 hover:bg-pink-50'
      : 'text-pink-400/90 hover:text-pink-300 hover:bg-pink-500/10';
  }
  return tema === 'light'
    ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
    : 'text-purple-400/90 hover:text-purple-300 hover:bg-purple-500/10';
}

/** Botões de ação — compactos e discretos. */
export const CARD_ACTION_BTN =
  'p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center';

export function cardNeutralActionClass(tema: string): string {
  return tema === 'light'
    ? 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 border border-zinc-100'
    : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/80 border border-zinc-800/80';
}

/** Tipografia confortável para leitura — menos “display”, mais corpo. */
export const FRASE_HEADLINE_CLASS =
  'text-lg md:text-xl font-semibold leading-relaxed tracking-normal line-clamp-5';

export function cardTitleHoverClass(accent: CardAccent): string {
  return accent === 'pink' ? 'hover:text-[#EC4899]' : 'hover:text-[#A855F7]';
}

export function cardTitleColorClass(tema: string): string {
  return tema === 'light' ? 'text-zinc-900' : 'text-zinc-100';
}

export function cardTitleLinkClass(
  tema: string,
  accent: CardAccent,
  variant: 'metafora' | 'frase'
): string {
  const size =
    variant === 'frase'
      ? FRASE_HEADLINE_CLASS
      : 'text-lg md:text-xl font-semibold leading-snug tracking-normal line-clamp-none';
  return [
    size,
    'transition-colors block mb-4 cursor-pointer',
    cardTitleHoverClass(accent),
    cardTitleColorClass(tema),
  ].join(' ');
}

export const FRASE_DETAIL_INFO_BG_LIGHT = 'bg-[#F3E8FF]';

export function cardImageBtnClass(accent: CardAccent): string {
  return accent === 'pink'
    ? 'p-2.5 bg-[#EC4899] hover:bg-pink-600 text-white rounded-xl transition-colors shrink-0 flex items-center justify-center'
    : 'p-2.5 bg-[#A855F7] hover:bg-[#9333EA] text-white rounded-xl transition-colors shrink-0 flex items-center justify-center';
}

export function cardShellClass(tema: string, accent: CardAccent): string {
  const border = cardBorderSoft(accent, tema);
  if (tema === 'light') {
    return `h-full rounded-3xl border ${border} bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow`;
  }
  return `h-full rounded-3xl border ${border} bg-[#161412] hover:bg-[#1a1816] transition-colors`;
}
