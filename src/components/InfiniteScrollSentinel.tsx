import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type InfiniteScrollSentinelProps = {
  hasMore: boolean;
  onLoadMore: () => void;
  tema?: string;
  loading?: boolean;
  /** Muda a cada lote para reobservar se o fim ainda está na tela. */
  loadedCount?: number;
  /** Distância do fim (px) para disparar o próximo lote sem o usuário parar. */
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
  loading = false,
  loadedCount = 0,
  rootMargin = '640px 0px',
}: InfiniteScrollSentinelProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const loadingRef = useRef(loading);
  const firedForCount = useRef<number | null>(null);

  onLoadMoreRef.current = onLoadMore;
  loadingRef.current = loading;

  useEffect(() => {
    if (!hasMore) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((entry) => entry.isIntersecting);
        if (!hit || loadingRef.current) return;
        if (firedForCount.current === loadedCount) return;
        firedForCount.current = loadedCount;
        onLoadMoreRef.current();
      },
      { root: null, rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, rootMargin, loadedCount, loading]);

  if (!hasMore) return null;

  return (
    <div
      ref={ref}
      className="w-full mt-8 mb-2 flex flex-col items-center justify-center gap-3 py-8"
      aria-busy={loading}
      aria-live="polite"
    >
      <div
        className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin ${
          tema === 'light' ? 'border-purple-300' : 'border-purple-500/45'
        }`}
        aria-hidden
      />
      <span
        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
          tema === 'light' ? 'text-zinc-400' : 'text-zinc-500'
        }`}
      >
        {t('home.loading_more', 'Carregando mais mensagens…')}
      </span>
    </div>
  );
}
