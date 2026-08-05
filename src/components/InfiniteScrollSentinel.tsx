import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type InfiniteScrollSentinelProps = {
  hasMore: boolean;
  onLoadMore: () => void;
  tema?: string;
  /** Distância do fim (px) para disparar o próximo lote. */
  rootMargin?: string;
};

/**
 * Sentinel de scroll infinito via IntersectionObserver.
 * Substitui o botão "Mais 12" — carrega ao aproximar do final da listagem.
 */
export default function InfiniteScrollSentinel({
  hasMore,
  onLoadMore,
  tema = 'dark',
  rootMargin = '400px 0px',
}: InfiniteScrollSentinelProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!hasMore) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit || loadingRef.current) return;
        loadingRef.current = true;
        onLoadMore();
        window.setTimeout(() => {
          loadingRef.current = false;
        }, 320);
      },
      { root: null, rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, rootMargin]);

  if (!hasMore) return null;

  return (
    <div
      ref={ref}
      className="w-full mt-8 mb-4 flex flex-col items-center justify-center gap-3 py-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className={`w-6 h-6 rounded-full border-2 border-t-transparent animate-spin ${
          tema === 'light' ? 'border-purple-300' : 'border-purple-500/50'
        }`}
        aria-hidden
      />
      <span
        className={`text-[10px] font-semibold uppercase tracking-widest ${
          tema === 'light' ? 'text-zinc-400' : 'text-zinc-500'
        }`}
      >
        {t('home.sharing_wisdom', 'Carregando…')}
      </span>
    </div>
  );
}
