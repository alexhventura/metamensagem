import React, { useEffect, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CARD_ACTION_BTN, type CardAccent } from '../lib/cardTheme';

function translateBtnClass(tema: string, accent: CardAccent): string {
  if (accent === 'pink') {
    return tema === 'light'
      ? 'bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-200/80'
      : 'bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20';
  }
  return tema === 'light'
    ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20';
}

type BrowserPageTranslateButtonProps = {
  tema: string;
  accent?: CardAccent;
  tooltipLabel?: string;
  menuPlacement?: 'top' | 'bottom';
  buttonClassName?: string;
};

export default function BrowserPageTranslateButton({
  tema,
  accent = 'purple',
  tooltipLabel,
  menuPlacement = 'top',
  buttonClassName,
}: BrowserPageTranslateButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const panelPosition =
    menuPlacement === 'bottom'
      ? 'top-full mt-2'
      : 'bottom-full mb-2';

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={tooltipLabel ?? t('translate_page.button', 'Ler no meu idioma')}
        onClick={() => setOpen((value) => !value)}
        className={`${CARD_ACTION_BTN} ${buttonClassName ?? translateBtnClass(tema, accent)}`}
      >
        <Languages size={18} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('translate_page.title', 'Traduzir página inteira')}
          className={`absolute right-0 z-50 w-72 rounded-2xl border p-4 text-left shadow-2xl ${panelPosition} ${
            tema === 'light'
              ? 'border-purple-100 bg-white text-zinc-800'
              : 'border-white/10 bg-zinc-950 text-zinc-100'
          }`}
        >
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[#A855F7]">
            {t('translate_page.title', 'Traduzir página inteira')}
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            {t(
              'translate_page.body',
              'Use a tradução nativa do Chrome, Edge ou Safari para traduzir frase, explicação, tags, menus e navegação de uma só vez.'
            )}
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed opacity-80">
            <li>
              {t(
                'translate_page.step_desktop',
                'No desktop, clique com o botão direito na página e escolha "Traduzir".'
              )}
            </li>
            <li>
              {t(
                'translate_page.step_mobile',
                'No celular, abra o menu do navegador e toque em "Traduzir".'
              )}
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
