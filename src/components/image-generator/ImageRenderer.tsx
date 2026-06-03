import { forwardRef, useMemo } from 'react';
import type { FormatConfig, ImageGeneratorQuote } from './types';
import type { SkinConfig } from './types';
import { imageFontFamilyFor } from './utils/imageFonts';
import {
  computeImageLayout,
  maxFooterLabelChars,
  truncateFooterLabel,
  validateFullText,
} from './utils/textLayout';

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
  const layout = useMemo(() => {
    const plan = computeImageLayout(texto, autor, format.width, format.height);
    if (!plan.quoteFits && import.meta.env.DEV) {
      console.warn('[ImageRenderer] frase excede QUOTE_ZONE', {
        chars: texto.length,
        blockH: plan.quoteBlockHeight,
        usable: plan.zones.quoteZoneHeight,
        extreme: plan.extremeQuoteMode,
      });
    }
    return plan;
  }, [texto, autor, format.width, format.height]);

  const fontFamily = useMemo(() => imageFontFamilyFor(texto, autor), [texto, autor]);
  const { zones } = layout;

  const footerPx = layout.footerPx;
  const footerInnerWidth = Math.floor(format.width * 0.8);
  const colSidePx = Math.floor(footerInnerWidth * 0.28);
  const colCenterPx = Math.floor(footerInnerWidth * 0.44);

  const footerDomain = 'metamensagem.com';
  const skinLabel = skin.name;
  const domainLabel = truncateFooterLabel(
    footerDomain,
    maxFooterLabelChars(colSidePx, footerPx, 0.5)
  );
  const skinLabelDisplay = truncateFooterLabel(
    skinLabel,
    maxFooterLabelChars(colCenterPx, footerPx, 0.48)
  );
  const serialLabel = truncateFooterLabel(
    serial,
    maxFooterLabelChars(colSidePx, layout.footerSerialPx, 0.52)
  );

  const metaFooterStyle = {
    fontSize: footerPx,
    fontWeight: 500 as const,
    letterSpacing: '0.4px',
    lineHeight: 1.2,
    opacity: 0.65,
  };

  const serialFooterStyle = {
    fontSize: layout.footerSerialPx,
    fontWeight: 400 as const,
    letterSpacing: '0.3px',
    lineHeight: 1.2,
    opacity: 0.55,
  };

  const authorTrim = autor?.trim() ?? '';

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
      data-mm-long-quote={layout.longQuoteMode ? '1' : '0'}
      data-mm-extreme-quote={layout.extremeQuoteMode ? '1' : '0'}
      data-mm-quote-fits={layout.quoteFits ? '1' : '0'}
      data-mm-text-integrity={validateFullText(texto, layout.lines) ? 'ok' : 'fail'}
      data-mm-author-expected={authorTrim}
    >
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

      <header
        className="absolute left-0 right-0 top-0 z-10 flex items-start justify-center pointer-events-none"
        style={{ height: zones.headerHeight }}
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

      <section
        data-mm-quote-zone
        className="absolute z-20 box-border pointer-events-none flex flex-col"
        style={{
          top: zones.quoteZoneTop,
          left: zones.padX,
          right: zones.padX,
          height: zones.quoteZoneHeight,
          maxHeight: zones.quoteZoneHeight,
          overflow: 'hidden',
          paddingTop: layout.quotePaddingTop,
          paddingBottom: 0,
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
        aria-label="Citação"
      >
        <blockquote
          className={`font-bold tracking-tight m-0 w-full text-center shrink-0 ${skin.textClass}`}
          style={{
            fontSize: layout.quotePx,
            lineHeight: `${layout.lineHeight}px`,
            maxWidth: '100%',
            fontWeight: 700,
            textShadow: '0 1px 24px rgba(0,0,0,0.12)',
          }}
        >
          {layout.lines.map((line, i) => (
            <span key={i} className="block break-words">
              {i === 0 ? '“' : ''}
              {line}
              {i === layout.lines.length - 1 ? '”' : ''}
            </span>
          ))}
        </blockquote>
      </section>

      {authorTrim ? (
        <section
          data-mm-author-zone
          className={`absolute left-0 right-0 z-[22] flex items-center justify-center text-center pointer-events-none ${skin.accentClass}`}
          style={{
            top: zones.authorZoneTop,
            height: zones.authorZoneHeight,
            paddingLeft: zones.padX,
            paddingRight: zones.padX,
          }}
          aria-label="Autor"
        >
          <p
            className="font-medium tracking-wide m-0 mx-auto truncate"
            style={{
              fontSize: layout.authorPx,
              lineHeight: `${Math.round(layout.authorPx * 1.2)}px`,
              maxWidth: '70%',
              opacity: 0.92,
            }}
          >
            — {authorTrim}
          </p>
        </section>
      ) : null}

      <footer
        className={`absolute left-0 right-0 z-30 flex items-end justify-center overflow-hidden pointer-events-none ${skin.accentClass}`}
        style={{
          top: zones.footerTop,
          height: zones.footerHeight,
          paddingLeft: layout.padX,
          paddingRight: layout.padX,
          paddingBottom: layout.padBottom,
          borderTop: '1px solid rgba(255,255,255,0.12)',
        }}
        aria-label="Metadados"
      >
        <div
          className="grid w-full max-w-[80%] mx-auto overflow-hidden min-w-0"
          style={{
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr)',
            gap: 10,
            fontFamily: 'Arial, Helvetica, sans-serif',
            alignItems: 'center',
          }}
        >
          <span className="lowercase text-left truncate min-w-0" style={metaFooterStyle}>
            {domainLabel}
          </span>
          <span className="text-center truncate min-w-0" style={metaFooterStyle}>
            {skinLabelDisplay}
          </span>
          <span className="tabular-nums text-right truncate min-w-0" style={serialFooterStyle}>
            {serialLabel}
          </span>
        </div>
      </footer>
    </div>
  );
});

export default ImageRenderer;
