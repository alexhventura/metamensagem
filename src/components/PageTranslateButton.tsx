import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CARD_ACTION_BTN, type CardAccent } from '../lib/cardTheme';
import { usePageTranslateOptional } from '../context/PageTranslateContext';
import { pageLanguageNativeName } from '../lib/translation/pageLanguages';
import type { CardLang } from '../lib/translation/types';

type PageTranslateButtonProps = {
  tema: string;
  accent?: CardAccent;
  /** Texto principal da página/card — detecção de idioma. */
  contentText?: string;
  /** Idioma conhecido do conteúdo (opcional). */
  contentLang?: CardLang;
  variant?: 'icon' | 'pill';
  menuPlacement?: 'top' | 'bottom';
  buttonClassName?: string;
  className?: string;
};

function translateBtnClass(tema: string, accent: CardAccent): string {
  if (accent === 'pink') {
    return tema === 'light'
      ? 'bg-pink-50/90 text-pink-600 hover:bg-pink-100 border border-pink-200/70'
      : 'bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20';
  }
  return tema === 'light'
    ? 'bg-purple-50/90 text-purple-600 hover:bg-purple-100 border border-purple-200/70'
    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20';
}

/** Fallback quando o provider ainda não montou — abre modal via evento global. */
function openTranslateModalFallback(): void {
  window.dispatchEvent(new CustomEvent('mm-open-page-translate'));
}

export default function PageTranslateButton({
  tema,
  accent = 'purple',
  contentText,
  contentLang,
  variant = 'icon',
  buttonClassName,
  className,
}: PageTranslateButtonProps) {
  const { t } = useTranslation();
  const ctx = usePageTranslateOptional();

  const hint = useMemo(() => {
    if (!ctx || !contentText?.trim()) return null;
    const browser = ctx.browserLang;
    if (!browser) return null;
    const source = contentLang;
    if (!source || source === browser || ctx.targetLang) return null;
    return {
      sourceName: pageLanguageNativeName(source),
      targetName: pageLanguageNativeName(browser),
    };
  }, [ctx, contentText, contentLang, ctx?.browserLang, ctx?.targetLang]);

  const openModal = () => {
    if (ctx) ctx.openModal();
    else openTranslateModalFallback();
  };

  const label = t('translate_page.button', '🌎 Ler no meu idioma');
  const isTranslating = ctx?.isTranslating ?? false;
  const activeLang = ctx?.targetLang;

  const baseClass =
    variant === 'pill'
      ? `inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${translateBtnClass(tema, accent)}`
      : `${CARD_ACTION_BTN} ${buttonClassName ?? translateBtnClass(tema, accent)}`;

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className ?? ''}`}>
      {hint && variant === 'pill' && (
        <p
          className={`max-w-[14rem] text-[10px] leading-snug text-right px-1 ${
            tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'
          }`}
          aria-live="polite"
        >
          {t('translate_page.hint_phrase', 'Esta frase está em {{source}}.', {
            source: hint.sourceName,
          })}{' '}
          {t('translate_page.hint_cta', 'Traduzir para {{target}}?', {
            target: hint.targetName,
          })}
        </p>
      )}

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={ctx?.isModalOpen ?? false}
        aria-busy={isTranslating}
        aria-label={
          activeLang
            ? t('translate_page.button_active', 'Idioma: {{lang}}. Alterar tradução.', {
                lang: pageLanguageNativeName(activeLang),
              })
            : label
        }
        onClick={openModal}
        className={`mm-page-translate-trigger ${baseClass}`}
      >
        {variant === 'pill' ? (
          <>
            <span aria-hidden>🌎</span>
            <span className="whitespace-nowrap">
              {isTranslating
                ? t('translate_page.translating_short', 'Traduzindo…')
                : t('translate_page.button_short', 'Ler no meu idioma')}
            </span>
          </>
        ) : (
          <span className="text-base leading-none" aria-hidden>
            🌎
          </span>
        )}
      </button>
    </div>
  );
}
