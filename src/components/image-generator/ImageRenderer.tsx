import { forwardRef, useMemo } from 'react';
import type { FormatConfig } from './types';
import type { SkinConfig } from './types';
import { generateCardSerial } from './utils/serialGenerator';
import { imageFontFamilyFor } from './utils/imageFonts';
import { quoteFontSize, wrapQuote } from './utils/textLayout';

export interface ImageRendererProps {
  texto: string;
  autor: string;
  format: FormatConfig;
  skin: SkinConfig;
  collectionName: string;
}

const ImageRenderer = forwardRef<HTMLDivElement, ImageRendererProps>(function ImageRenderer(
  { texto, autor, format, skin, collectionName },
  ref
) {
  const serial = useMemo(() => generateCardSerial(texto, autor), [texto, autor]);

  const layout = useMemo(() => {
    const isWide = format.width > format.height;
    const isTall = format.height > format.width * 1.4;
    const maxChars = isWide ? 42 : isTall ? 28 : 32;
    const maxLines = isTall ? 14 : isWide ? 5 : 8;
    const lines = wrapQuote(texto, maxChars, maxLines);
    const fontSize = quoteFontSize(texto.length, format.height);
    return { lines, fontSize };
  }, [texto, format]);

  const padding = Math.round(format.width * 0.08);
  const fontFamily = useMemo(() => imageFontFamilyFor(texto, autor), [texto, autor]);

  return (
    <div
      ref={ref}
      className={`relative flex flex-col overflow-hidden ${skin.bgClass} ${skin.borderClass ?? 'border-white/10'}`}
      style={{
        width: format.width,
        height: format.height,
        fontFamily,
        ...skin.cardStyle,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <header
        className="relative z-10 flex flex-col items-center justify-center shrink-0"
        style={{ paddingTop: padding, paddingBottom: padding * 0.4 }}
      >
        <img
          src="/brand/logo.svg"
          alt=""
          width={Math.round(format.width * 0.12)}
          height={Math.round(format.width * 0.12)}
          crossOrigin="anonymous"
          className="mb-3 drop-shadow-lg"
        />
        <span className={`text-[10px] font-black uppercase tracking-[0.45em] ${skin.accentClass}`}>
          Metamensagem
        </span>
      </header>

      <main
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-[8%]"
        style={{ minHeight: 0 }}
      >
        <blockquote
          className={`font-black leading-[1.12] tracking-tight ${skin.textClass}`}
          style={{ fontSize: layout.fontSize, textWrap: 'balance' as const }}
        >
          {layout.lines.map((line, i) => (
            <span key={i} className="block">
              {i === 0 ? '“' : ''}
              {line}
              {i === layout.lines.length - 1 ? '”' : ''}
            </span>
          ))}
        </blockquote>
        <p
          className={`mt-6 font-semibold tracking-wide ${skin.accentClass}`}
          style={{ fontSize: Math.max(14, layout.fontSize * 0.38) }}
        >
          — {autor}
        </p>
      </main>

      <footer
        className={`relative z-10 flex items-end justify-between gap-3 shrink-0 border-t border-white/10 ${skin.accentClass}`}
        style={{
          padding,
          paddingTop: padding * 0.65,
          fontSize: Math.max(10, format.width * 0.016),
          letterSpacing: '0.06em',
        }}
      >
        <span className="font-medium opacity-85 truncate min-w-0 text-left leading-tight">
          <span className="lowercase">metamensagem.com</span>
          <span className="opacity-60 mx-1">•</span>
          <span className="uppercase tracking-wider text-[0.92em]">Coleção {collectionName}</span>
        </span>
        <span className="font-semibold opacity-90 tabular-nums text-right shrink-0 leading-tight whitespace-nowrap">
          {skin.name} #{serial}
        </span>
      </footer>
    </div>
  );
});

export default ImageRenderer;
