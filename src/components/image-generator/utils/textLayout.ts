/** Layout por zonas — frase só em QUOTE_ZONE; autor/rodapé fixos; sem truncar. */
import { computeLayoutZones, type LayoutZones } from './safeZone';

export const LONG_QUOTE_CHAR_THRESHOLD = 100;

const LINE_HEIGHT_STEPS = [1.6, 1.5, 1.4, 1.3, 1.22, 1.12, 1.05];
const LINE_HEIGHT_STEPS_LONG = [1.45, 1.35, 1.28, 1.2, 1.12, 1.06, 1.02];

export type ImageLayoutPlan = {
  zones: LayoutZones;
  lines: string[];
  quotePx: number;
  authorPx: number;
  logoPx: number;
  padX: number;
  padTop: number;
  padBottom: number;
  footerPx: number;
  lineHeight: number;
  lineHeightRatio: number;
  quoteBlockHeight: number;
  quoteFits: boolean;
  longQuoteMode: boolean;
  fullTextVerified: boolean;
  /** @deprecated compat */
  safe: LayoutZones & { quoteTop: number; quoteBottom: number; quoteHeight: number };
  gapQuoteAuthor: number;
  authorBottomGap: number;
};

export function normalizeQuoteText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

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

function splitOversizedWord(word: string, maxChars: number): string[] {
  if (word.length <= maxChars) return [word];
  const parts: string[] = [];
  for (let i = 0; i < word.length; i += maxChars) {
    parts.push(word.slice(i, i + maxChars));
  }
  return parts;
}

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

function computeFooterPx(height: number, skinName: string, serial: string): number {
  const longest = Math.max(skinName.length, serial.length, 18);
  let px = Math.max(8, Math.min(12, Math.round(height * 0.0105)));
  if (longest > 22) px = Math.max(7, px - 1);
  if (longest > 32) px = Math.max(7, px - 1);
  return px;
}

function computeAuthorPx(autor: string, zones: LayoutZones): number {
  if (!autor.trim() || zones.authorZoneHeight <= 0) return 0;
  const maxPx = Math.round(zones.authorZoneHeight * 0.42);
  const minPx = 9;
  const maxWidth = zones.quoteWidth;
  for (let px = maxPx; px >= minPx; px -= 1) {
    const est = (autor.length + 3) * px * 0.48;
    if (est <= maxWidth) return px;
  }
  return minPx;
}

function fontBounds(zones: LayoutZones, longMode: boolean, charCount: number) {
  const aspect = zones.width / zones.height;
  const isWide = aspect >= 1.15;
  const isUltraTall = zones.height > zones.width * 1.55;

  let fontMax = zones.quoteZoneHeight * (isWide ? 0.22 : isUltraTall ? 0.14 : 0.18);
  if (longMode) fontMax *= 0.9;
  if (charCount > 200) fontMax *= 0.9;
  if (charCount > 320) fontMax *= 0.86;
  if (charCount > 450) fontMax *= 0.84;

  const fontMin = Math.max(7, Math.round(zones.quoteZoneHeight * (longMode ? 0.048 : 0.058)));
  return { fontMax: Math.round(fontMax), fontMin };
}

function toLegacySafe(zones: LayoutZones) {
  return {
    ...zones,
    quoteTop: zones.quoteZoneTop,
    quoteBottom: zones.authorZoneTop,
    quoteHeight: zones.quoteZoneHeight,
  };
}

function buildPlan(
  zones: LayoutZones,
  opts: {
    lines: string[];
    quotePx: number;
    authorPx: number;
    lineHeight: number;
    lineHeightRatio: number;
    quoteBlockHeight: number;
    quoteFits: boolean;
    longQuoteMode: boolean;
    originalText: string;
    footerPx: number;
    hasAuthor: boolean;
  }
): ImageLayoutPlan {
  const fullTextVerified = validateFullText(opts.originalText, opts.lines);
  return {
    zones,
    safe: toLegacySafe(zones),
    lines: opts.lines,
    quotePx: opts.quotePx,
    authorPx: opts.authorPx,
    logoPx: zones.logoPx,
    padX: zones.padX,
    padTop: Math.round(zones.headerHeight * 0.28),
    padBottom: Math.max(8, Math.round(zones.footerHeight * 0.26)),
    footerPx: opts.footerPx,
    lineHeight: opts.lineHeight,
    lineHeightRatio: opts.lineHeightRatio,
    quoteBlockHeight: opts.quoteBlockHeight,
    quoteFits: opts.quoteFits && fullTextVerified,
    longQuoteMode: opts.longQuoteMode,
    fullTextVerified,
    gapQuoteAuthor: 0,
    authorBottomGap: 0,
  };
}

/**
 * Mede e ajusta até quoteFits === true (fonte → line-height → mais linhas implícito no wrap).
 */
export function computeImageLayout(
  texto: string,
  autor: string,
  width: number,
  height: number
): ImageLayoutPlan {
  const clean = normalizeQuoteText(texto);
  const hasAuthor = Boolean(autor?.trim());
  const zones = computeLayoutZones(width, height, hasAuthor);
  const longQuoteMode = clean.length >= LONG_QUOTE_CHAR_THRESHOLD;
  const authorPx = computeAuthorPx(autor, zones);
  const footerPx = computeFooterPx(height, 'Coleção', 'MMM-2026-00000001');
  const { fontMax, fontMin } = fontBounds(zones, longQuoteMode, clean.length);
  const lhSteps = longQuoteMode ? LINE_HEIGHT_STEPS_LONG : LINE_HEIGHT_STEPS;

  let best: ImageLayoutPlan | null = null;

  for (const lhRatio of lhSteps) {
    for (let quotePx = fontMax; quotePx >= fontMin; quotePx -= quotePx > 40 ? 2 : 1) {
      const lines = wrapQuoteFull(clean, zones.quoteWidth, quotePx);
      if (!validateFullText(clean, lines)) continue;

      const lineHeight = quotePx * lhRatio;
      const quoteBlockHeight = lines.length * lineHeight;
      const quoteFits = quoteBlockHeight <= zones.quoteZoneHeight;

      const candidate = buildPlan(zones, {
        lines,
        quotePx,
        authorPx,
        lineHeight,
        lineHeightRatio: lhRatio,
        quoteBlockHeight,
        quoteFits,
        longQuoteMode,
        originalText: clean,
        footerPx,
        hasAuthor,
      });

      if (quoteFits && candidate.fullTextVerified) {
        return candidate;
      }

      if (
        !best ||
        (candidate.fullTextVerified && !best.fullTextVerified) ||
        (candidate.quoteBlockHeight < best.quoteBlockHeight && candidate.fullTextVerified)
      ) {
        best = candidate;
      }
    }
  }

  if (best?.quoteFits && best.fullTextVerified) {
    return best;
  }

  const quotePx = fontMin;
  const lines = wrapQuoteFull(clean, zones.quoteWidth, quotePx);
  const lineHeight = quotePx * 1.02;
  const quoteBlockHeight = lines.length * lineHeight;
  const quoteFits = quoteBlockHeight <= zones.quoteZoneHeight && validateFullText(clean, lines);

  return buildPlan(zones, {
    lines,
    quotePx,
    authorPx,
    lineHeight,
    lineHeightRatio: 1.02,
    quoteBlockHeight,
    quoteFits,
    longQuoteMode: true,
    originalText: clean,
    footerPx,
    hasAuthor,
  });
}

export function computeFooterFontSize(
  height: number,
  skinName: string,
  serial: string
): number {
  return computeFooterPx(height, skinName, serial);
}

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

export function assertLayoutReady(plan: ImageLayoutPlan): void {
  if (!plan.fullTextVerified) {
    throw new Error('Texto da frase incompleto no layout.');
  }
  if (!plan.quoteFits) {
    throw new Error(
      'A frase não cabe na zona de citação. Tente um formato mais alto ou reduza o texto.'
    );
  }
}

export function assertExportTextIntegrity(root: HTMLElement, originalText: string): void {
  assertLayoutReadyFromDom(root);
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
  const authorEl = root.querySelector('[data-mm-author-zone]');
  const expectedAuthor = root.getAttribute('data-mm-author-expected');
  if (expectedAuthor && authorEl) {
    const ra = strip(authorEl.textContent ?? '');
    const ea = strip(expectedAuthor);
    if (ea && ra !== ea) {
      throw new Error('Autor incompleto ou ausente na imagem.');
    }
  }
}

function assertLayoutReadyFromDom(root: HTMLElement): void {
  if (root.getAttribute('data-mm-quote-fits') === '0') {
    throw new Error('Layout inválido: frase ultrapassa a zona de citação.');
  }
}
