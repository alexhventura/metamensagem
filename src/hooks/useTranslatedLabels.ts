import { useEffect, useMemo, useState } from 'react';
import { usePageTranslateOptional } from '../context/PageTranslateContext';

/**
 * Traduz rótulos curtos (tags, categorias, títulos relacionados) conforme o idioma da página.
 */
export function useTranslatedLabels(labels: string[], scopeId: string): {
  labelFor: (text: string) => string;
  isPending: boolean;
} {
  const ctx = usePageTranslateOptional();
  const [map, setMap] = useState<Map<string, string>>(() => new Map());
  const signature = useMemo(
    () => [...new Set(labels.filter(Boolean))].sort().join('\u0001'),
    [labels]
  );

  useEffect(() => {
    if (!ctx?.translateLabels || !signature) {
      setMap(new Map());
      return;
    }

    let cancelled = false;
    const unique = signature.split('\u0001');

    void ctx.translateLabels(unique, scopeId).then((next) => {
      if (!cancelled) setMap(next);
    });

    return () => {
      cancelled = true;
    };
  }, [ctx, ctx?.targetLang, ctx?.translateLabels, scopeId, signature]);

  const labelFor = (text: string) => map.get(text) ?? text;

  return {
    labelFor,
    isPending: (ctx?.isTranslating ?? false) && map.size === 0 && Boolean(signature),
  };
}
