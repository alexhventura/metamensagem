import { forwardRef, useMemo } from 'react';
import type { FormatConfig, ImageGeneratorQuote } from './types';
import type { SkinConfig } from './types';
import { imageFontFamilyFor } from './utils/imageFonts';
import { computeImageLayout } from './utils/textLayout';

export interface ImageRendererProps {
  texto: string;
  autor: string;
  format: FormatConfig;
  skin: SkinConfig;
  collectionName: string;
  serial: string;
  quoteMeta?: Pick<ImageGeneratorQuote, 'id' | 'categoria' | 'locale'>;
}

const ImageRenderer = forwardRef<HTMLDivElement, ImageRendererProps>(function ImageRenderer(
  { texto, autor, format, skin, collectionName, serial, quoteMeta },
  ref
) {
  const layout = useMemo(
    () => computeImageLayout(texto, autor, format.width, format.height),
    [texto, autor, format.width, format.height]
  );

  const fontFamily = useMemo(() => imageFontFamilyFor(texto, autor), [texto, autor]);

  const skinLabel = skin.name.length > 18 ? `${skin.name.slice(0, 16)}…` : skin.name;

  return (
    <div
      ref={ref}
      className={`mm-image-export relative overflow-hidden ${skin.bgClass} ${skin.borderClass ?? 'border-white/10'}`}
      style={{
        width: format.width,
        height: format.height,
        fontFamily,
        ...skin.cardStyle,
      }}
      data-mm-phrase-id={quoteMeta?.id}
      data-mm-category={quoteMeta?.categoria ?? skin.category ?? collectionName}
      data-mm-skin={skin.id}
      data-mm-locale={quoteMeta?.locale ?? 'pt'}
      data-mm-serial={serial}
    >
      {/* Vinheta suave — Soft Premium */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 0%, rgba(0,0,0,0.12) 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Logo — marca d'água discreta */}
      <header
        className="absolute left-0 right-0 top-0 z-10 flex items-start justify-center pointer-events-none"
        style={{ height: layout.safe.headerHeight }}
      >
        <img
          src="/brand/logo.svg"
          alt=""
          width={layout.logoPx}
          height={layout.logoPx}
          crossOrigin="anonymous"
          className="opacity-[0.42]"
          style={{
            width: layout.logoPx,
            height: layout.logoPx,
            marginTop: layout.padTop,
            filter: 'drop-shadow(0 1px 8px rgba(0,0,0,0.15))',
          }}
        />
      </header>

      {/* Safe zone — somente frase + autor */}
      <main
        className="absolute z-20 flex flex-col items-center justify-center text-center"
        style={{
          top: layout.safe.quoteTop,
          left: layout.safe.padX,
          right: layout.safe.padX,
          height: layout.safe.quoteHeight,
          maxHeight: layout.safe.quoteHeight,
          overflow: 'hidden',
        }}
      >
        <blockquote
          className={`font-bold tracking-tight ${skin.textClass}`}
          style={{
            fontSize: layout.quotePx,
            lineHeight: layout.lineHeight / layout.quotePx,
            margin: 0,
            maxWidth: '100%',
            fontWeight: 700,
            textShadow: '0 1px 24px rgba(0,0,0,0.12)',
          }}
        >
          {layout.lines.map((line, i) => (
            <span key={i} className="block">
              {i === 0 ? '“' : ''}
              {line}
              {i === layout.lines.length - 1 ? '”' : ''}
            </span>
          ))}
        </blockquote>
        {autor?.trim() ? (
          <p
            className={`font-medium tracking-wide shrink-0 ${skin.accentClass}`}
            style={{
              fontSize: layout.authorPx,
              marginTop: layout.gapQuoteAuthor,
              marginBottom: 0,
              maxWidth: '100%',
              lineHeight: 1.2,
              opacity: 0.92,
            }}
          >
            — {autor}
          </p>
        ) : null}
      </main>

      {/* Rodapé institucional — colado à margem inferior */}
      <footer
        className={`absolute bottom-0 left-0 right-0 z-30 flex items-end justify-between gap-3 ${skin.accentClass}`}
        style={{
          height: layout.safe.footerHeight,
          paddingLeft: layout.padX,
          paddingRight: layout.padX,
          paddingBottom: layout.padBottom,
          fontSize: layout.footerPx,
          letterSpacing: '0.03em',
          opacity: 0.72,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)',
        }}
      >
        <span className="font-medium lowercase leading-none truncate min-w-0">metamensagem.com</span>
        <span
          className="font-medium leading-none truncate text-center opacity-90 flex-1 px-2"
          style={{ maxWidth: '40%' }}
        >
          {skinLabel}
        </span>
        <span className="font-semibold tabular-nums leading-none shrink-0 whitespace-nowrap">
          {serial}
        </span>
      </footer>
    </div>
  );
});

export default ImageRenderer;
