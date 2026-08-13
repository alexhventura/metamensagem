import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Globe2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { usePageTranslate } from '../context/PageTranslateContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { PAGE_TRANSLATE_LANGUAGES } from '../lib/translation/pageLanguages';
import type { CardLang } from '../lib/translation/types';

function getModalRoot(): HTMLElement {
  return document.getElementById('mm-modal-root') ?? document.body;
}

export default function PageTranslateModal() {
  const { t } = useTranslation();
  const { tema } = useTheme();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const {
    isModalOpen,
    closeModal,
    selectLanguage,
    targetLang,
    isTranslating,
    resetToOriginal,
  } = usePageTranslate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pendingLang, setPendingLang] = useState<CardLang | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    if (!isModalOpen) return;
    document.body.classList.add('mm-modal-open');
    const root = document.getElementById('mm-modal-root');
    root?.setAttribute('aria-hidden', 'false');

    const prevFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button[data-lang]')?.focus();
    }, 80);

    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove('mm-modal-open');
      root?.setAttribute('aria-hidden', 'true');
      prevFocus?.focus?.();
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isTranslating) setPendingLang(null);
  }, [isTranslating]);

  const handleSelect = async (code: CardLang) => {
    if (isTranslating) return;
    setPendingLang(code);
    await selectLanguage(code);
  };

  if (!isModalOpen && !isTranslating) return null;

  const modal = (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="mm-modal-overlay mm-page-translate-overlay flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 z-0 bg-black/55 backdrop-blur-[6px]"
            onClick={closeModal}
            aria-label={t('translate_page.close', 'Fechar')}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mm-page-translate-title"
            aria-describedby="mm-page-translate-desc"
            initial={{ opacity: 0, y: isMobile ? 48 : 16, scale: isMobile ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? 32 : 12, scale: isMobile ? 1 : 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`mm-modal-panel mm-page-translate-panel w-full sm:max-w-md max-h-[min(88dvh,640px)] overflow-hidden flex flex-col ${
              isMobile
                ? 'rounded-t-[1.75rem] pb-[max(1rem,env(safe-area-inset-bottom))]'
                : 'rounded-[1.5rem] sm:mx-4'
            } border shadow-2xl ${
              tema === 'light'
                ? 'bg-white/95 border-zinc-200/90'
                : 'bg-[#161412]/96 border-zinc-700/80'
            }`}
          >
            <div
              className={`mm-page-translate-handle sm:hidden mx-auto mt-3 mb-1 h-1 w-10 rounded-full ${
                tema === 'light' ? 'bg-zinc-300' : 'bg-zinc-600'
              }`}
              aria-hidden
            />

            <header
              className={`flex items-start justify-between gap-3 px-5 pt-4 sm:pt-5 pb-3 border-b shrink-0 ${
                tema === 'light' ? 'border-zinc-100' : 'border-zinc-800/80'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                      tema === 'light' ? 'bg-purple-50 text-purple-600' : 'bg-purple-500/15 text-purple-300'
                    }`}
                    aria-hidden
                  >
                    <Globe2 size={18} />
                  </span>
                  <h2
                    id="mm-page-translate-title"
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      tema === 'light' ? 'text-zinc-900' : 'text-zinc-50'
                    }`}
                  >
                    {t('translate_page.modal_title', '🌎 Traduzir página')}
                  </h2>
                </div>
                <p
                  id="mm-page-translate-desc"
                  className={`text-sm leading-snug ${tema === 'light' ? 'text-zinc-600' : 'text-zinc-400'}`}
                >
                  {t('translate_page.modal_subtitle', 'Escolha o idioma desejado.')}
                </p>
                <p className={`mt-1 text-xs ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {t('translate_page.modal_note', 'A tradução será aplicada à página inteira.')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={`p-2 rounded-xl border shrink-0 transition-colors ${
                  tema === 'light'
                    ? 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                    : 'border-zinc-700 hover:bg-zinc-800/80 text-zinc-300'
                }`}
                aria-label={t('translate_page.close', 'Fechar')}
              >
                <X size={18} />
              </button>
            </header>

            <div
              className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 sm:py-4"
              role="listbox"
              aria-label={t('translate_page.language_list', 'Idiomas disponíveis')}
            >
              <ul className="space-y-1.5">
                {PAGE_TRANSLATE_LANGUAGES.map((lang) => {
                  const selected = targetLang === lang.code;
                  const pending = pendingLang === lang.code && isTranslating;
                  return (
                    <li key={lang.code}>
                      <button
                        type="button"
                        data-lang={lang.code}
                        role="option"
                        aria-selected={selected}
                        disabled={isTranslating}
                        onClick={() => void handleSelect(lang.code)}
                        className={`mm-page-translate-lang w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left transition-all duration-200 disabled:opacity-60 ${
                          selected
                            ? tema === 'light'
                              ? 'border-purple-300 bg-purple-50/80'
                              : 'border-purple-500/40 bg-purple-500/10'
                            : tema === 'light'
                              ? 'border-transparent hover:border-zinc-200 hover:bg-zinc-50'
                              : 'border-transparent hover:border-zinc-700 hover:bg-zinc-800/50'
                        }`}
                      >
                        <span className="text-xl leading-none shrink-0" aria-hidden>
                          {lang.flag}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span
                            className={`block text-sm font-bold truncate ${
                              tema === 'light' ? 'text-zinc-900' : 'text-zinc-100'
                            }`}
                          >
                            {lang.native}
                          </span>
                          <span
                            className={`block text-xs truncate ${
                              tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'
                            }`}
                          >
                            {lang.label}
                          </span>
                        </span>
                        {pending ? (
                          <span
                            className="text-xs font-semibold text-purple-500 shrink-0"
                            aria-live="polite"
                          >
                            {t('translate_page.translating_page', '✓ Traduzindo página...')}
                          </span>
                        ) : selected ? (
                          <Check size={18} className="text-purple-500 shrink-0" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {targetLang && (
              <footer
                className={`px-5 py-3 border-t shrink-0 ${
                  tema === 'light' ? 'border-zinc-100 bg-zinc-50/80' : 'border-zinc-800/80 bg-zinc-950/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void resetToOriginal()}
                  disabled={isTranslating}
                  className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors ${
                    tema === 'light'
                      ? 'text-zinc-600 hover:bg-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800/60'
                  }`}
                >
                  {t('translate_menu.original', 'Ver original')}
                </button>
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, getModalRoot());
}
