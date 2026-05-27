import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Languages, Loader2 } from 'lucide-react';
import {
  CARD_LANG_OPTIONS,
  type CardContentDisplay,
  type CardContentSource,
  type CardLang,
  detectCardLanguage,
  translateCardContent,
} from '../lib/translation';

type CardTranslateMenuProps = {
  tema: string;
  source: CardContentSource;
  onDisplayChange: (display: CardContentDisplay) => void;
  tooltipLabel?: string;
};

export function CardTranslateMenu({
  tema,
  source,
  onDisplayChange,
  tooltipLabel = 'Traduzir',
}: CardTranslateMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState<CardLang | 'original'>('original');
  const rootRef = useRef<HTMLDivElement>(null);

  const detected = useMemo(() => detectCardLanguage(source.texto), [source.texto]);

  const resetOriginal = useCallback(() => {
    setActiveLang('original');
    onDisplayChange({ ...source, isTranslated: false });
  }, [source, onDisplayChange]);

  const selectLang = useCallback(
    async (target: CardLang | 'original') => {
      if (target === 'original') {
        resetOriginal();
        setOpen(false);
        return;
      }

      if (target === detected) {
        resetOriginal();
        setOpen(false);
        return;
      }

      setLoading(true);
      setActiveLang(target);
      try {
        const translated = await translateCardContent(source, target);
        onDisplayChange(translated);
      } catch {
        resetOriginal();
      } finally {
        setLoading(false);
        setOpen(false);
      }
    },
    [source, detected, onDisplayChange, resetOriginal]
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={tooltipLabel}
        aria-expanded={open}
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className={`p-3.5 rounded-2xl transition-all ${btnClass} ${
          activeLang !== 'original' ? 'ring-2 ring-[#A855F7]/40 text-[#A855F7]' : ''
        }`}
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
            className={`absolute bottom-full right-0 mb-2 z-[120] min-w-[168px] rounded-2xl border shadow-2xl overflow-hidden ${
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
