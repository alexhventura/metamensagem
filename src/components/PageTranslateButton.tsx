import React from 'react';
import { useTranslation } from 'react-i18next';
import { CARD_ACTION_BTN, type CardAccent } from '../lib/cardTheme';
import { usePageTranslateOptional } from '../context/PageTranslateContext';
import { pageLanguageNativeName } from '../lib/translation/pageLanguages';
import {
  pageTranslateButtonAriaLabel,
  pageTranslateButtonShortLabel,
  shouldShowPageTranslate,
} from '../lib/translation/pageTranslateVisibility';
import type { CardLang } from '../lib/translation/types';

type PageTranslateButtonProps = {
  tema: string;
  accent?: CardAccent;
  contentText?: string;
  contentLang?: CardLang;
  variant?: 'icon' | 'pill';
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

function openTranslateModalFallback(): void {
  window.dispatchEvent(new CustomEvent('mm-open-page-translate'));
}

export default function PageTranslateButton({
  tema,
  accent = 'purple',
  contentLang,
  variant = 'icon',
  buttonClassName,
  className,
}: PageTranslateButtonProps) {
  const { t } = useTranslation();
  const ctx = usePageTranslateOptional();

  if (!shouldShowPageTranslate(contentLang)) {
    return null;
  }

  const openModal = () => {
    if (ctx) ctx.openModal();
    else openTranslateModalFallback();
  };

  const isTranslating = ctx?.isTranslating ?? false;
  const activeLang = ctx?.targetLang ?? null;
  const shortLabel = pageTranslateButtonShortLabel(contentLang, activeLang);
  const ariaLabel = pageTranslateButtonAriaLabel(contentLang, activeLang);

  const baseClass =
    variant === 'pill'
      ? `inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${translateBtnClass(tema, accent)}`
      : `${CARD_ACTION_BTN} ${buttonClassName ?? translateBtnClass(tema, accent)}`;

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className ?? ''}`}>
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
            : ariaLabel
        }
        onClick={openModal}
        className={`mm-page-translate-trigger ${baseClass}`}
      >
        {variant === 'pill' ? (
          <span className="whitespace-nowrap">
            {isTranslating
              ? t('translate_page.translating_short', 'Traduzindo…')
              : shortLabel}
          </span>
        ) : (
          <span className="text-base leading-none" aria-hidden>
            🌎
          </span>
        )}
      </button>
    </div>
  );
}
