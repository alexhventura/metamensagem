import React, { useEffect, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CARD_ACTION_BTN, type CardAccent } from '../lib/cardTheme';
import { usePageTranslateOptional } from '../context/PageTranslateContext';
import {
  BROWSER_NATIVE_TRANSLATE_EVENT,
  type BrowserNativeTranslateState,
} from '../lib/translation/browserNativeTranslate';

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

/**
 * Botão de traduzir em cards/detalhes.
 * Abre o modal de tradução da página inteira (mesmo fluxo do header).
 * Quando o navegador ativa a tradução nativa, o painel abre sozinho.
 */
export default function BrowserPageTranslateButton({
  tema,
  accent = 'purple',
  tooltipLabel,
  menuPlacement = 'top',
  buttonClassName,
}: BrowserPageTranslateButtonProps) {
  const { t } = useTranslation();
  const ctx = usePageTranslateOptional();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const autoOpened = useRef(false);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const openPageTranslate = () => {
    if (ctxRef.current) ctxRef.current.openModal();
    else window.dispatchEvent(new CustomEvent('mm-open-page-translate'));
  };

  useEffect(() => {
    const onNative = (event: Event) => {
      const detail = (event as CustomEvent<BrowserNativeTranslateState>).detail;
      if (!detail?.active) {
        autoOpened.current = false;
        setOpen(false);
        return;
      }
      setOpen(true);
      if (!autoOpened.current) {
        autoOpened.current = true;
        openPageTranslate();
      }
    };
    window.addEventListener(BROWSER_NATIVE_TRANSLATE_EVENT, onNative);
    return () => window.removeEventListener(BROWSER_NATIVE_TRANSLATE_EVENT, onNative);
  }, []);

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

  const panelPosition = menuPlacement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2';

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open || Boolean(ctx?.isModalOpen)}
        aria-label={tooltipLabel ?? t('translate_page.button', 'Traduzir página')}
        onClick={() => {
          setOpen(true);
          openPageTranslate();
        }}
        className={`mm-card-translate-trigger ${CARD_ACTION_BTN} ${buttonClassName ?? translateBtnClass(tema, accent)}`}
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
              'translate_page.card_sync_body',
              'A tradução vale para a página inteira — frases, metáforas, menus e navegação — não só este card.'
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              openPageTranslate();
              setOpen(false);
            }}
            className="mt-3 w-full rounded-xl bg-[#A855F7] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#9333ea] transition-colors"
          >
            {t('translate_page.button_short', 'Traduzir página')}
          </button>
        </div>
      )}
    </div>
  );
}
