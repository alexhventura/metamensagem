import { useEffect, useRef, useState } from 'react';
import type { CardContentDisplay, CardContentSource, CardLang } from '../lib/translation/types';
import { usePageTranslateOptional } from '../context/PageTranslateContext';

/**
 * Registra conteúdo dinâmico no motor de tradução de página.
 * Retorna `display` atualizado quando o usuário escolhe um idioma.
 */
export function usePageContentTranslate(options: {
  id: string;
  source: CardContentSource;
}): {
  display: CardContentDisplay;
  isPageTranslating: boolean;
  pageTargetLang: CardLang | null;
} {
  const ctx = usePageTranslateOptional();
  const sourceRef = useRef(options.source);
  sourceRef.current = options.source;

  const [display, setDisplay] = useState<CardContentDisplay>(() => ({
    ...options.source,
    isTranslated: false,
  }));

  useEffect(() => {
    setDisplay({
      ...options.source,
      isTranslated: false,
      translationFailed: false,
    });
  }, [
    options.id,
    options.source.texto,
    options.source.titulo,
    options.source.resumo,
    options.source.explicacao,
    options.source.autor,
  ]);

  useEffect(() => {
    if (!ctx) return;
    return ctx.registerContent({
      id: options.id,
      getSource: () => sourceRef.current,
      setDisplay,
    });
  }, [ctx, options.id, ctx?.targetLang]);

  const sourceReady = useRef(false);
  useEffect(() => {
    if (!ctx?.refreshContent || !ctx.targetLang) return;
    if (!options.source.texto?.trim()) return;
    if (!sourceReady.current) {
      sourceReady.current = true;
      return;
    }
    ctx.refreshContent(options.id);
  }, [
    ctx,
    ctx?.targetLang,
    ctx?.refreshContent,
    options.id,
    options.source.texto,
    options.source.titulo,
    options.source.resumo,
    options.source.explicacao,
    options.source.autor,
  ]);

  return {
    display,
    isPageTranslating: ctx?.isTranslating ?? false,
    pageTargetLang: ctx?.targetLang ?? null,
  };
}
