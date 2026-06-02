import { useEffect, useRef, useState } from 'react';

/** Ativa conteúdo secundário quando o elemento entra no viewport (rootMargin padrão ~200px). */
export function useLazyWhenVisible<T extends Element = HTMLDivElement>(
  rootMargin = '200px 0px'
): { ref: React.RefObject<T | null>; visible: boolean } {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return { ref, visible };
}
