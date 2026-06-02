/** Layout tipográfico — frase 100% visível, sem truncar nem reticências. */
import { computeSafeZone, type SafeZoneMetrics } from './safeZone';

export const LONG_QUOTE_CHAR_THRESHOLD = 100;

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
  authorBottomGap: number;
  longQuoteMode: boolean;
  fullTextVerified: boolean;
};

export function normalizeQuoteText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Compara texto original vs linhas renderizadas (ignora espaços e quebras). */
export function validateFullText(original: string, lines: string[]): boolean {
  const strip = (s: string) => normalizeQuoteText(s).replace(/\s/g, '');
  const a = strip(original);
  const b = strip(lines.join(''));
  if (!a) return !b;
  return a === b;
}

function charWidthPx(fontPx: number): number {
  return fontPx * 0.52;
}

function maxCharsPerLine(quoteWidthPx: number, fontPx: number): number {
  return Math.max(6, Math.floor(quoteWidthPx / charWidthPx(fontPx)));
}

/** Quebra palavra longa em pedaços que cabem na linha — sem "..." */
function splitOversizedWord(word: string, maxChars: number): string[] {
  if (word.length <= maxChars) return [word];
  const parts: string[] = [];
  for (let i = 0; i < word.length; i += maxChars) {
    parts.push(word.slice(i, i + maxChars));
  }
  return parts;
}

/**
 * Quebra por palavras; nunca omite caracteres nem usa reticências.
 */
export function wrapQuoteFull(text: string, quoteWidthPx: number, fontPx: number): string[] {
  const clean = normalizeQuoteText(text);
  if (!clean) return [''];

  const maxChars = maxCharsPerLine(quoteWidthPx, fontPx);
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  const flush = () => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };

  for (const rawWord of words) {
    if (!rawWord) continue;
    for (const word of splitOversizedWord(rawWord, maxChars)) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        flush();
        current = word;
      }
    }
  }
  flush();

  return lines.length ? lines : [clean];
}

function authorBlockHeight(authorPx: number, gapQuoteAuthor: number, authorBottomGap: number, hasAuthor: boolean): number {
  if (!hasAuthor) return authorBottomGap;
  return Math.round(authorPx * 1.28) + gapQuoteAuthor + authorBottomGap;
}

function quoteAreaMetrics(
  safe: SafeZoneMetrics,
  height: number,
  hasAuthor: boolean,
  authorPx: number,
  gapQuoteAuthor: number,
  authorBottomGap: number
) {
  const authorBlock = authorBlockHeight(authorPx, gapQuoteAuthor, authorBottomGap, hasAuthor);
  const quoteAreaHeight = Math.max(safe.quoteHeight * 0.35, safe.quoteHeight - authorBlock);
  return { quoteAreaHeight, authorBlock };
}

function lineHeightFor(fontPx: number, longMode: boolean): number {
  return fontPx * (longMode ? 1.1 : 1.14);
}

function computeFooterPx(height: number, skinName: string, serial: string): number {
  const longest = Math.max(skinName.length, serial.length, 18);
  let px = Math.max(8, Math.min(12, Math.round(height * 0.0105)));
  if (longest > 22) px = Math.max(7, px - 1);
  if (longest > 32) px = Math.max(7, px - 1);
  return px;
}

/** Tipografia dentro da safe zone — integridade do texto acima da estética. */
export function computeImageLayout(
  texto: string,
  autor: string,
  width: number,
  height: number
): ImageLayoutPlan {
  const safe = computeSafeZone(width, height);
  const clean = normalizeQuoteText(texto);
  const hasAuthor = Boolean(autor?.trim());

  const aspect = width / height;
  const isWide = aspect >= 1.15;
  const isTall = aspect <= 0.72;
  const isUltraTall = height > width * 1.55;

  const longQuoteMode = clean.length >= LONG_QUOTE_CHAR_THRESHOLD;
  const authorBottomGap = Math.max(26, Math.round(height * 0.028));
  const gapQuoteAuthor = hasAuthor ? Math.max(10, Math.round(height * 0.012)) : 0;

  const charCount = clean.length;
  let fontMax = safe.quoteHeight * (isWide ? 0.2 : isUltraTall ? 0.13 : 0.17);
  if (longQuoteMode) fontMax *= 0.88;
  if (charCount > 200) fontMax *= 0.9;
  if (charCount > 320) fontMax *= 0.86;

  const fontMin = Math.max(8, Math.round(safe.quoteHeight * (longQuoteMode ? 0.055 : 0.065)));

  const skinNamePlaceholder = 'Coleção';
  const serialPlaceholder = 'MMM-2026-00000001';
  const footerPx = computeFooterPx(height, skinNamePlaceholder, serialPlaceholder);

  let authorPx = Math.max(11, Math.round(fontMax * 0.36));

  for (let quotePx = Math.round(fontMax); quotePx >= fontMin; quotePx -= quotePx > 36 ? 2 : 1) {
    authorPx = Math.max(10, Math.round(quotePx * 0.36));
    const lineHeight = lineHeightFor(quotePx, longQuoteMode);
    const { quoteAreaHeight } = quoteAreaMetrics(
      safe,
      height,
      hasAuthor,
      authorPx,
      gapQuoteAuthor,
      authorBottomGap
    );

    const lines = wrapQuoteFull(clean, safe.quoteWidth, quotePx);
    if (!validateFullText(clean, lines)) continue;

    const quoteBlockHeight = lines.length * lineHeight;
    const authorPart = hasAuthor ? gapQuoteAuthor + authorPx * 1.28 : 0;
    const totalContent = quoteBlockHeight + authorPart;

    if (totalContent <= quoteAreaHeight) {
      return {
        safe,
        lines,
        quotePx,
        authorPx,
        logoPx: safe.logoPx,
        padX: safe.padX,
        padTop: Math.round(safe.headerHeight * 0.32),
        padBottom: Math.max(10, Math.round(safe.footerHeight * 0.28)),
        footerPx,
        lineHeight,
        gapQuoteAuthor,
        authorBottomGap,
        longQuoteMode,
        fullTextVerified: true,
      };
    }
  }

  const quotePx = fontMin;
  authorPx = Math.max(9, Math.round(quotePx * 0.34));
  const lineHeight = lineHeightFor(quotePx, true);
  const lines = wrapQuoteFull(clean, safe.quoteWidth, quotePx);

  let verified = validateFullText(clean, lines);
  if (!verified) {
    const tighter = wrapQuoteFull(clean, safe.quoteWidth, Math.max(7, quotePx - 1));
    if (validateFullText(clean, tighter)) {
      return buildPlan({
        safe,
        lines: tighter,
        quotePx: Math.max(7, quotePx - 1),
        authorPx,
        height,
        hasAuthor,
        gapQuoteAuthor,
        authorBottomGap,
        longQuoteMode: true,
        footerPx,
        lineHeight: lineHeightFor(Math.max(7, quotePx - 1), true),
        originalText: clean,
      });
    }
  }

  return buildPlan({
    safe,
    lines,
    quotePx,
    authorPx,
    height,
    hasAuthor,
    gapQuoteAuthor,
    authorBottomGap,
    longQuoteMode: true,
    footerPx,
    lineHeight,
    originalText: clean,
    fullTextVerified: verified,
  });
}

function buildPlan(opts: {
  safe: SafeZoneMetrics;
  lines: string[];
  quotePx: number;
  authorPx: number;
  height: number;
  hasAuthor: boolean;
  gapQuoteAuthor: number;
  authorBottomGap: number;
  longQuoteMode: boolean;
  footerPx: number;
  lineHeight: number;
  originalText: string;
  fullTextVerified?: boolean;
}): ImageLayoutPlan {
  const {
    safe,
    lines,
    quotePx,
    authorPx,
    height,
    hasAuthor,
    gapQuoteAuthor,
    authorBottomGap,
    longQuoteMode,
    footerPx,
    lineHeight,
    fullTextVerified,
    originalText,
  } = opts;

  return {
    safe,
    lines,
    quotePx,
    authorPx,
    logoPx: safe.logoPx,
    padX: safe.padX,
    padTop: Math.round(safe.headerHeight * 0.32),
    padBottom: Math.max(10, Math.round(safe.footerHeight * 0.28)),
    footerPx,
    lineHeight,
    gapQuoteAuthor,
    authorBottomGap,
    longQuoteMode,
    fullTextVerified: fullTextVerified ?? validateFullText(originalText, lines),
  };
}

export function computeFooterFontSize(
  height: number,
  skinName: string,
  serial: string
): number {
  return computeFooterPx(height, skinName, serial);
}

/** Tamanho da fonte do rótulo da skin no rodapé (nome completo, sem cortar). */
export function computeFooterSkinFontSize(
  footerPx: number,
  skinName: string,
  columnWidthPx: number
): number {
  for (let px = footerPx; px >= 6; px -= 1) {
    const est = skinName.length * px * 0.48;
    if (est <= columnWidthPx) return px;
  }
  return 6;
}

/** Falha export se o DOM não contiver o texto integral. */
export function assertExportTextIntegrity(root: HTMLElement, originalText: string): void {
  const block = root.querySelector('blockquote');
  if (!block) return;
  const strip = (s: string) => normalizeQuoteText(s).replace(/[""\s]/g, '');
  const rendered = strip(block.textContent ?? '');
  const expected = strip(originalText);
  if (rendered !== expected) {
    throw new Error(
      `Texto incompleto na imagem (${rendered.length}/${expected.length} caracteres).`
    );
  }
}
