/** Quebra frase em linhas para cartão (sem canvas). */
import { computeSafeZone, type SafeZoneMetrics } from './safeZone';

export function wrapQuote(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [''];

  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word.length > maxCharsPerLine ? `${word.slice(0, maxCharsPerLine - 1)}…` : word;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.endsWith('…') ? last : `${last.replace(/[.,;:!?]$/, '')}…`;
  }

  return lines.length ? lines : [clean.slice(0, maxCharsPerLine)];
}

export type ImageLayoutPlan = {
  safe: SafeZoneMetrics;
  lines: string[];
  quotePx: number;
  authorPx: number;
  logoPx: number;
  padX: number;
  padTop: number;
  padBottom: number;
  footerPx: number;
  lineHeight: number;
  gapQuoteAuthor: number;
};

/** Tipografia dentro da safe zone — nunca invade logo/rodapé. */
export function computeImageLayout(
  texto: string,
  autor: string,
  width: number,
  height: number
): ImageLayoutPlan {
  const safe = computeSafeZone(width, height);
  const hasAuthor = Boolean(autor?.trim());
  const authorReserve = hasAuthor ? Math.round(safe.quoteHeight * 0.14) : 0;
  const quoteAreaHeight = safe.quoteHeight - authorReserve;
  const gapQuoteAuthor = hasAuthor ? Math.round(safe.quoteHeight * 0.04) : 0;

  const aspect = width / height;
  const isWide = aspect >= 1.15;
  const isTall = aspect <= 0.72;
  const isUltraTall = height > width * 1.55;

  const charCount = texto.length;
  let fontMax = quoteAreaHeight * (isWide ? 0.22 : isUltraTall ? 0.14 : 0.18);
  let fontMin = quoteAreaHeight * (isWide ? 0.1 : 0.11);
  if (charCount > 160) fontMax *= 0.9;
  if (charCount > 260) fontMax *= 0.82;

  const maxLinesCap = isWide ? 5 : isUltraTall ? 14 : isTall ? 11 : 8;

  for (let quotePx = Math.round(fontMax); quotePx >= Math.round(fontMin); quotePx -= 1) {
    const lineHeight = quotePx * 1.16;
    const maxChars = Math.max(
      10,
      Math.floor(safe.quoteWidth / (quotePx * 0.5))
    );
    const maxLines = Math.max(2, Math.min(maxLinesCap, Math.floor(quoteAreaHeight / lineHeight)));
    const lines = wrapQuote(texto, maxChars, maxLines);
    const usedHeight = lines.length * lineHeight + (hasAuthor ? gapQuoteAuthor + quotePx * 0.38 : 0);
    if (usedHeight <= quoteAreaHeight) {
      return {
        safe,
        lines,
        quotePx,
        authorPx: Math.max(11, Math.round(quotePx * 0.36)),
        logoPx: safe.logoPx,
        padX: safe.padX,
        padTop: Math.round(safe.headerHeight * 0.35),
        padBottom: Math.round(safe.footerHeight * 0.35),
        footerPx: Math.max(9, Math.min(12, Math.round(height * 0.0105))),
        lineHeight,
        gapQuoteAuthor,
      };
    }
  }

  const fallbackPx = Math.round(fontMin);
  const lineHeight = fallbackPx * 1.14;
  const maxChars = Math.max(10, Math.floor(safe.quoteWidth / (fallbackPx * 0.5)));
  const lines = wrapQuote(texto, maxChars, maxLinesCap);

  return {
    safe,
    lines,
    quotePx: fallbackPx,
    authorPx: Math.max(11, Math.round(fallbackPx * 0.34)),
    logoPx: safe.logoPx,
    padX: safe.padX,
    padTop: Math.round(safe.headerHeight * 0.35),
    padBottom: Math.round(safe.footerHeight * 0.35),
    footerPx: Math.max(9, Math.min(12, Math.round(height * 0.0105))),
    lineHeight,
    gapQuoteAuthor,
  };
}
