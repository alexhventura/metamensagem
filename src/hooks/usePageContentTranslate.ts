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
  sourceLang?: CardLang;
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
      sourceLang: options.sourceLang,
    });
  }, [ctx, options.id, options.sourceLang, ctx?.targetLang]);

  return {
    display,
    isPageTranslating: ctx?.isTranslating ?? false,
    pageTargetLang: ctx?.targetLang ?? null,
  };
}
