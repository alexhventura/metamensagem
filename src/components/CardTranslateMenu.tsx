import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Languages, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CARD_LANG_OPTIONS, CARD_LANG_SUCCESS_LABEL } from '../lib/translation/cardLanguages';
import type { CardContentDisplay, CardContentSource, CardLang } from '../lib/translation/types';
import {
  detectCardLanguageWithConfidence,
  textAppearsToBeLanguage,
} from '../lib/translation/detect';
import { TranslationFailedError } from '../lib/translation/types';
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

function translateActiveRing(accent: CardAccent): string {
  return accent === 'pink' ? 'ring-2 ring-pink-500/40 text-pink-500' : 'ring-2 ring-[#A855F7]/40 text-[#A855F7]';
}

function translateRetryClass(accent: CardAccent): string {
  return accent === 'pink' ? 'text-pink-500 hover:text-pink-600' : 'text-[#A855F7] hover:text-[#9333EA]';
}

type CardTranslateMenuProps = {
  tema: string;
  contentId?: string;
  source: CardContentSource;
  onDisplayChange: (display: CardContentDisplay) => void;
  onLoadingChange?: (loading: boolean) => void;
  tooltipLabel?: string;
  menuPlacement?: 'top' | 'bottom';
  buttonClassName?: string;
  accent?: CardAccent;
};

export function CardTranslateMenu({
  tema,
  contentId,
  source,
  onDisplayChange,
  onLoadingChange,
  tooltipLabel = 'Traduzir',
  menuPlacement = 'top',
  buttonClassName,
  accent = 'purple',
}: CardTranslateMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState<CardLang | 'original'>('original');
  const [failedTarget, setFailedTarget] = useState<CardLang | null>(null);
  const [successLang, setSuccessLang] = useState<CardLang | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const detection = useMemo(
    () => detectCardLanguageWithConfidence(source.texto),
    [source.texto]
  );

  const resetOriginal = useCallback(() => {
    setActiveLang('original');
    setFailedTarget(null);
    setSuccessLang(null);
    onDisplayChange({ ...source, isTranslated: false, translationFailed: false });
  }, [source, onDisplayChange]);

  const runTranslation = useCallback(
    async (target: CardLang, retry = false) => {
      setLoading(true);
      onLoadingChange?.(true);
      setFailedTarget(null);
      setSuccessLang(null);
      setActiveLang(target);
      try {
        const { translateCardContent } = await import('../lib/translation/translationEngine');
        const translated = await translateCardContent(source, target, {
          contentId,
          force: retry,
          skipCache: retry,
        });
        onDisplayChange(translated);
        setSuccessLang(target);
        setFailedTarget(null);
      } catch (err) {
        const lang = err instanceof TranslationFailedError ? err.target : target;
        setFailedTarget(lang);
        setSuccessLang(null);
        onDisplayChange({
          ...source,
          isTranslated: false,
          translationFailed: true,
          targetLang: lang,
        });
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
        setOpen(false);
      }
    },
    [source, contentId, onDisplayChange, onLoadingChange]
  );

  const selectLang = useCallback(
    async (target: CardLang | 'original', retry = false) => {
      if (target === 'original') {
        resetOriginal();
        setOpen(false);
        return;
      }

      if (
        !retry &&
        target === detection.lang &&
        detection.confidence >= 0.55 &&
        textAppearsToBeLanguage(source.texto, target)
      ) {
        resetOriginal();
        setOpen(false);
        return;
      }

      await runTranslation(target, retry);
    },
    [source, detection, resetOriginal, runTranslation]
  );

  useEffect(() => {
    resetOriginal();
  }, [source.texto, source.titulo, source.resumo, source.autor, source.explicacao, resetOriginal]);

  useEffect(() => {
    if (!successLang) return;
    const timer = window.setTimeout(() => setSuccessLang(null), 4000);
    return () => window.clearTimeout(timer);
  }, [successLang]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  const btnClass = translateBtnClass(tema, accent);
  const statusMessage = loading
    ? t('translate_menu.translating', 'Traduzindo...')
    : failedTarget
      ? t('translate_menu.unavailable', 'Tradução indisponível')
      : successLang
        ? t('translate_menu.success', '✓ Traduzido para {{lang}}', {
            lang: CARD_LANG_SUCCESS_LABEL[successLang],
          })
        : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div
        className={`absolute right-0 z-[130] w-[11rem] min-h-[2.5rem] pointer-events-none ${
          menuPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}
        aria-live="polite"
      >
        <AnimatePresence>
          {(statusMessage || (failedTarget && !loading)) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`pointer-events-auto w-full rounded-xl border px-2 py-1.5 text-center shadow-lg backdrop-blur-sm ${
                tema === 'light'
                  ? 'bg-white/95 border-zinc-200/90'
                  : 'bg-zinc-950/95 border-zinc-700/80'
              }`}
              role="status"
            >
              {statusMessage && (
                <p
                  className={`text-[8px] leading-snug font-medium flex items-center justify-center gap-1 ${
                    successLang
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : failedTarget
                        ? tema === 'light'
                          ? 'text-amber-700'
                          : 'text-amber-300'
                        : tema === 'light'
                          ? 'text-zinc-600'
                          : 'text-zinc-400'
                  }`}
                >
                  {successLang && <Check size={10} className="shrink-0" />}
                  {statusMessage}
                </p>
              )}
              {failedTarget && !loading && (
                <button
                  type="button"
                  onClick={() => selectLang(failedTarget, true)}
                  disabled={loading}
                  className={`mt-0.5 text-[8px] font-bold transition-colors ${translateRetryClass(accent)}`}
                >
                  {t('translate_menu.retry', 'Tentar novamente')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        aria-label={tooltipLabel}
        aria-expanded={open}
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className={`${CARD_ACTION_BTN} transition-colors ${btnClass} ${buttonClassName || ''} ${
          activeLang !== 'original' && !failedTarget ? translateActiveRing(accent) : ''
        } ${failedTarget ? 'ring-1 ring-amber-500/25' : ''}`}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin shrink-0" />
        ) : (
          <Languages size={18} className="shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: menuPlacement === 'top' ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: menuPlacement === 'top' ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={`absolute right-0 z-[120] min-w-[188px] max-h-[min(320px,50vh)] overflow-y-auto rounded-2xl border shadow-2xl ${
              menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            } ${
              tema === 'light' ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-800'
            }`}
            role="menu"
          >
            <p
              className={`px-3 py-2 text-[9px] font-black uppercase tracking-[0.25em] border-b sticky top-0 z-10 ${
                tema === 'light'
                  ? 'text-zinc-400 border-zinc-100 bg-white'
                  : 'text-zinc-500 border-zinc-800 bg-zinc-950'
              }`}
            >
              {t('translate_menu.language', 'Idioma')}
            </p>
            {CARD_LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => selectLang(opt.code)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                  activeLang === opt.code
                    ? accent === 'pink'
                      ? 'bg-pink-500/15 text-pink-500'
                      : 'bg-[#A855F7]/15 text-[#A855F7]'
                    : tema === 'light'
                      ? 'hover:bg-zinc-50 text-zinc-700'
                      : 'hover:bg-zinc-900 text-zinc-300'
                }`}
              >
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
            {activeLang !== 'original' && (
              <button
                type="button"
                role="menuitem"
                onClick={() => selectLang('original')}
                className={`w-full text-left px-3 py-2 border-t text-[11px] font-bold uppercase tracking-wider transition-colors sticky bottom-0 ${
                  tema === 'light'
                    ? 'border-zinc-100 text-zinc-500 hover:bg-zinc-50 bg-white'
                    : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 bg-zinc-950'
                }`}
              >
                {t('translate_menu.original', 'Ver original')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
