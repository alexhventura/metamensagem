import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Languages, Loader2, RotateCcw } from 'lucide-react';
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

type CardTranslateMenuProps = {
  tema: string;
  contentId?: string;
  source: CardContentSource;
  onDisplayChange: (display: CardContentDisplay) => void;
  tooltipLabel?: string;
  /** Abre o menu para baixo (página de detalhe da metáfora). */
  menuPlacement?: 'top' | 'bottom';
  buttonClassName?: string;
};

export function CardTranslateMenu({
  tema,
  contentId,
  source,
  onDisplayChange,
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
        setOpen(false);
      }
    },
    [source, contentId, onDisplayChange]
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

  return (
    <div ref={rootRef} className="relative flex flex-col items-end gap-1">
      {failedTarget && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide max-w-[200px] ${
            tema === 'light'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
          }`}
          role="status"
        >
          <AlertCircle size={11} className="shrink-0" aria-hidden />
          <span className="truncate">Tradução indisponível</span>
          <button
            type="button"
            onClick={() => selectLang(failedTarget, true)}
            disabled={loading}
            className={`shrink-0 inline-flex items-center gap-0.5 underline-offset-2 hover:underline ${
              tema === 'light' ? 'text-amber-900' : 'text-amber-200'
            }`}
            title="Tentar novamente"
          >
            <RotateCcw size={10} aria-hidden />
            <span>Repetir</span>
          </button>
        </motion.div>
      )}

      <button
        type="button"
        aria-label={tooltipLabel}
        aria-expanded={open}
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className={`${buttonClassName || 'p-3.5'} rounded-2xl transition-all ${btnClass} ${
          activeLang !== 'original' && !failedTarget
            ? 'ring-2 ring-[#A855F7]/40 text-[#A855F7]'
            : ''
        } ${failedTarget ? 'ring-2 ring-amber-500/30 text-amber-400' : ''}`}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Languages size={18} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
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
