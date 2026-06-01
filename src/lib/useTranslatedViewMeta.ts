import { useEffect } from 'react';

/**
 * Visualização traduzida pelo botão Traduzir — não indexar (UX only).
 * Restaura robots ao voltar ao original ou desmontar.
 */
export function useTranslatedViewMeta(isTranslated: boolean): void {
  useEffect(() => {
    if (!isTranslated) return;

    const meta = document.querySelector('meta[name="robots"]');
    const previous = meta?.getAttribute('content') ?? 'index, follow';

    if (!meta) {
      const el = document.createElement('meta');
      el.setAttribute('name', 'robots');
      el.setAttribute('content', 'noindex, nofollow');
      document.head.appendChild(el);
    } else {
      meta.setAttribute('content', 'noindex, nofollow');
    }

    return () => {
      const current = document.querySelector('meta[name="robots"]');
      if (current) current.setAttribute('content', previous);
    };
  }, [isTranslated]);
}
