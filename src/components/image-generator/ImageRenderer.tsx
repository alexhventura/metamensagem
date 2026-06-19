import { forwardRef, useMemo } from 'react';
import type { FormatConfig, ImageGeneratorQuote } from './types';
import type { SkinConfig } from './types';
import { decorativeOrbsForSkin, watermarkOpacityForSkin } from './utils/decorativeLayer';
import type { ImageFontId } from './fonts';
import { imageFontFamilyFor } from './utils/imageFonts';
import {
  computeImageLayout,
  formatFooterSignature,
  maxFooterLabelChars,
  QUOTE_CONTENT_MAX_WIDTH_RATIO,
  resolveFooterFormatProfile,
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
  fontFamilyOverride?: string;
  textColorOverride?: string | null;
  fontId?: ImageFontId;
}

const ImageRenderer = forwardRef<HTMLDivElement, ImageRendererProps>(function ImageRenderer(
  {
    texto,
    autor,
    format,
    skin,
    collectionName,
    serial,
    quoteMeta,
    fontFamilyOverride,
    textColorOverride,
    fontId,
  },
  ref
) {
  const layout = useMemo(() => {
    const plan = computeImageLayout(texto, autor, format.width, format.height, { fontId });
    if (!plan.quoteFits && import.meta.env.DEV) {
      console.warn('[ImageRenderer] frase excede QUOTE_ZONE', {
        chars: texto.length,
        blockH: plan.quoteBlockHeight,
        usable: plan.zones.quoteZoneHeight,
        extreme: plan.extremeQuoteMode,
      });
    }
    return plan;
  }, [texto, autor, format.width, format.height, fontId]);

  const fontFamily = useMemo(
    () => fontFamilyOverride ?? imageFontFamilyFor(texto, autor),
    [fontFamilyOverride, texto, autor]
  );
  const { zones } = layout;
  const formatProfile = resolveFooterFormatProfile(format.width, format.height);

  const footerPx = layout.footerPx;
  const footerInnerWidth = Math.floor(format.width * 0.84);
  const footerSignature = truncateFooterLabel(
    formatFooterSignature(serial),
    maxFooterLabelChars(footerInnerWidth, footerPx, 0.48)
  );

  const decorativeOrbs = useMemo(
    () => decorativeOrbsForSkin(skin, formatProfile),
    [skin, formatProfile]
  );
  const watermarkOpacity = watermarkOpacityForSkin(skin);

  const metaFooterStyle = {
    fontSize: footerPx,
    fontWeight: 500 as const,
    letterSpacing: '0.35px',
    lineHeight: 1.35,
    opacity: 0.52,
  };

  const authorTrim = autor?.trim() ?? '';
  const quoteColorStyle = textColorOverride ? { color: textColorOverride } : undefined;
  const authorColorStyle = textColorOverride
    ? { color: textColorOverride, opacity: 0.94 }
    : undefined;

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
      data-mm-render-variant="soft-premium-signature-v4"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 0%, rgba(0,0,0,0.12) 100%)',
        }}
      />

      {decorativeOrbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: orb.left,
            right: orb.right,
            top: orb.top,
            bottom: orb.bottom,
            width: orb.size,
            height: orb.size,
            background: `rgba(${orb.color}, ${orb.opacity})`,
            filter: `blur(${orb.blur}px)`,
            zIndex: 1,
          }}
        />
      ))}

      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          zIndex: 2,
        }}
      />

      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 5 }}
        aria-hidden
      >
        <img
          src="/brand/logo.svg"
          alt=""
          crossOrigin="anonymous"
          className="select-none"
          style={{
            width: layout.logoPx * 2.6,
            height: layout.logoPx * 2.6,
            opacity: watermarkOpacity,
            transform: 'rotate(-18deg)',
            filter: 'drop-shadow(0 2px 16px rgba(0,0,0,0.08))',
          }}
        />
      </div>

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
          className="opacity-[0.32]"
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
          paddingBottom: layout.quotePaddingBottom,
          paddingLeft: 10,
          paddingRight: 10,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        aria-label="Citação"
      >
        <blockquote
          className={`font-bold m-0 mx-auto text-center shrink-0 ${textColorOverride ? '' : skin.textClass}`}
          style={{
            fontSize: layout.quotePx,
            lineHeight: `${layout.lineHeight}px`,
            maxWidth: `${QUOTE_CONTENT_MAX_WIDTH_RATIO * 100}%`,
            fontWeight: 700,
            letterSpacing: layout.lines.length <= 3 ? '-0.02em' : '-0.01em',
            textShadow: '0 2px 12px rgba(0,0,0,0.25)',
            ...quoteColorStyle,
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
          className={`absolute left-0 right-0 z-[22] flex items-center justify-center text-center pointer-events-none ${
            textColorOverride ? '' : skin.accentClass
          }`}
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
              lineHeight: `${Math.round(layout.authorPx * 1.22)}px`,
              maxWidth: '70%',
              fontWeight: 500,
              ...(authorColorStyle ?? { opacity: 0.82 }),
            }}
          >
            — {authorTrim}
          </p>
        </section>
      ) : null}

      <footer
        className={`absolute left-0 right-0 z-30 flex items-center justify-center overflow-hidden pointer-events-none ${skin.accentClass}`}
        style={{
          top: zones.footerTop,
          height: zones.footerHeight,
          paddingLeft: layout.padX,
          paddingRight: layout.padX,
          paddingBottom: layout.padBottom,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
        aria-label="Metadados"
      >
        <div
          className="flex w-full max-w-[84%] mx-auto items-center justify-center overflow-hidden min-w-0 text-center"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          <span className="lowercase truncate w-full min-w-0 tabular-nums" style={metaFooterStyle}>
            {footerSignature}
          </span>
        </div>
      </footer>
    </div>
  );
});

export default ImageRenderer;
