import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Languages, Loader2 } from 'lucide-react';
import {
  CARD_LANG_OPTIONS,
  type CardContentDisplay,
  type CardContentSource,
  type CardLang,
  detectCardLanguageWithConfidence,
  textAppearsToBeLanguage,
  TranslationFailedError,
  translateCardContent,
} from '../lib/translation';

/** Altura/largura fixa do botão (alinha com p-3.5 + ícone 18px). */
const BTN_BOX = 'h-[3.375rem] w-[3.375rem]';

type CardTranslateMenuProps = {
  tema: string;
  contentId?: string;
  source: CardContentSource;
  onDisplayChange: (display: CardContentDisplay) => void;
  onLoadingChange?: (loading: boolean) => void;
  tooltipLabel?: string;
  menuPlacement?: 'top' | 'bottom';
  buttonClassName?: string;
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
}: CardTranslateMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState<CardLang | 'original'>('original');
  const [failedTarget, setFailedTarget] = useState<CardLang | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const detection = useMemo(
    () => detectCardLanguageWithConfidence(source.texto),
    [source.texto]
  );

  const resetOriginal = useCallback(() => {
    setActiveLang('original');
    setFailedTarget(null);
    onDisplayChange({ ...source, isTranslated: false, translationFailed: false });
  }, [source, onDisplayChange]);

  const runTranslation = useCallback(
    async (target: CardLang, retry = false) => {
      setLoading(true);
      onLoadingChange?.(true);
      setFailedTarget(null);
      setActiveLang(target);
      try {
        const translated = await translateCardContent(source, target, {
          contentId,
          force: retry,
          skipCache: retry,
        });
        onDisplayChange(translated);
        setFailedTarget(null);
      } catch (err) {
        const lang =
          err instanceof TranslationFailedError ? err.target : target;
        setFailedTarget(lang);
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
  }, [source.texto, source.titulo, source.resumo, resetOriginal]);

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

  const btnClass =
    tema === 'light'
      ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
      : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 border border-white/5';

  const sizeClass = buttonClassName ? '' : BTN_BOX;

  return (
    <div
      ref={rootRef}
      className={`relative shrink-0 ${sizeClass} ${buttonClassName ? '' : ''}`}
    >
      {/* Slot fixo: overlay de erro não altera altura do card */}
      <div
        className={`absolute right-0 z-[130] w-[9.75rem] min-h-[2.5rem] pointer-events-none ${
          menuPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}
        aria-live="polite"
      >
        <AnimatePresence>
          {failedTarget && !loading && (
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
              <p
                className={`text-[8px] leading-snug font-medium ${
                  tema === 'light' ? 'text-zinc-600' : 'text-zinc-400'
                }`}
              >
                Não foi possível traduzir agora
              </p>
              <button
                type="button"
                onClick={() => selectLang(failedTarget, true)}
                disabled={loading}
                className="mt-0.5 text-[8px] font-bold text-[#A855F7] hover:text-[#9333EA] transition-colors"
              >
                Tentar novamente
              </button>
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
        className={`flex items-center justify-center rounded-2xl transition-colors ${btnClass} ${
          buttonClassName || `${BTN_BOX} p-0`
        } ${
          activeLang !== 'original' && !failedTarget
            ? 'ring-2 ring-[#A855F7]/40 text-[#A855F7]'
            : ''
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
            className={`absolute right-0 z-[120] min-w-[168px] rounded-2xl border shadow-2xl overflow-hidden ${
              menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            } ${
              tema === 'light'
                ? 'bg-white border-zinc-200'
                : 'bg-zinc-950 border-zinc-800'
            }`}
            role="menu"
          >
            <p
              className={`px-3 py-2 text-[9px] font-black uppercase tracking-[0.25em] border-b ${
                tema === 'light' ? 'text-zinc-400 border-zinc-100' : 'text-zinc-500 border-zinc-800'
              }`}
            >
              Idioma
            </p>
            {CARD_LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => selectLang(opt.code)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                  activeLang === opt.code
                    ? 'bg-[#A855F7]/15 text-[#A855F7]'
                    : tema === 'light'
                      ? 'hover:bg-zinc-50 text-zinc-700'
                      : 'hover:bg-zinc-900 text-zinc-300'
                }`}
              >
                <span aria-hidden>{opt.flag}</span>
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
            {activeLang !== 'original' && (
              <button
                type="button"
                role="menuitem"
                onClick={() => selectLang('original')}
                className={`w-full text-left px-3 py-2 border-t text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  tema === 'light'
                    ? 'border-zinc-100 text-zinc-500 hover:bg-zinc-50'
                    : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                Ver original
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
