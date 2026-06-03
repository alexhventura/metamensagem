import { useCallback, useEffect, useRef } from 'react';
import { prefetchFraseDetail } from '../lib/prefetchFrase';

/** Hover + visibilidade (IntersectionObserver) para prefetch de frases. */
export function usePrefetchFrase(slug: string | undefined) {
  const ref = useRef<HTMLDivElement>(null);

  const prefetch = useCallback(() => {
    if (slug) prefetchFraseDetail(slug);
  }, [slug]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !slug) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) prefetchFraseDetail(slug);
      },
      { rootMargin: '240px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [slug]);

  return { ref, onMouseEnter: prefetch, onFocus: prefetch };
}
