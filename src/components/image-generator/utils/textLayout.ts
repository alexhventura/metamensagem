/** Layout por zonas — medição conservadora; LONG/EXTREME; sem truncar. */
import { computeLayoutZones, type LayoutZones, type ZoneDensity } from './safeZone';

export const LONG_QUOTE_CHAR_THRESHOLD = 150;
export const EXTREME_QUOTE_CHAR_THRESHOLD = 300;
export const LONG_QUOTE_MIN_LINES = 5;

/** Margem interna da QUOTE_ZONE (topo + base). */
const QUOTE_ZONE_INNER_PAD = 10;
/** Slack por linha (ascendentes/descendentes reais vs. métrica teórica). */
const LINE_METRICS_EXTRA_RATIO = 0.14;
/** Espaço extra para aspas tipográficas. */
const QUOTE_MARKS_EXTRA_RATIO = 0.12;

const LINE_HEIGHT_STEPS = [1.55, 1.45, 1.38, 1.32, 1.26, 1.2, 1.14, 1.08, 1.04];
const LINE_HEIGHT_STEPS_LONG = [1.38, 1.32, 1.26, 1.2, 1.14, 1.1, 1.06, 1.03, 1.0];
const LINE_HEIGHT_STEPS_EXTREME = [1.28, 1.22, 1.16, 1.12, 1.08, 1.05, 1.02, 1.0];

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
  quotePaddingTop: number;
  quoteFits: boolean;
  longQuoteMode: boolean;
  extremeQuoteMode: boolean;
  fullTextVerified: boolean;
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

function resolveDensity(text: string, quoteWidth: number, fontProbe: number): ZoneDensity {
  if (text.length >= EXTREME_QUOTE_CHAR_THRESHOLD) return 'extreme';
  const probeLines = wrapQuoteFull(text, quoteWidth, fontProbe).length;
  if (text.length >= LONG_QUOTE_CHAR_THRESHOLD || probeLines >= LONG_QUOTE_MIN_LINES) {
    return 'long';
  }
  return 'normal';
}

function usableQuoteHeight(zoneHeight: number): number {
  return Math.max(32, zoneHeight - QUOTE_ZONE_INNER_PAD * 2);
}

/** Altura renderizada estimada (maior que lines × lineHeight puro). */
export function estimateRenderedBlockHeight(
  lineCount: number,
  quotePx: number,
  lineHeightPx: number
): number {
  const perLine = lineHeightPx + quotePx * LINE_METRICS_EXTRA_RATIO;
  const marks = quotePx * QUOTE_MARKS_EXTRA_RATIO;
  return lineCount * perLine + marks;
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
  const cap = zones.density === 'extreme' ? 0.38 : 0.42;
  const maxPx = Math.round(zones.authorZoneHeight * cap);
  const minPx = zones.density === 'extreme' ? 8 : 9;
  const maxWidth = zones.quoteWidth;
  for (let px = maxPx; px >= minPx; px -= 1) {
    const est = (autor.length + 3) * px * 0.48;
    if (est <= maxWidth) return px;
  }
  return minPx;
}

function fontBounds(zones: LayoutZones, density: ZoneDensity, charCount: number) {
  const usable = usableQuoteHeight(zones.quoteZoneHeight);
  const aspect = zones.width / zones.height;
  const isWide = aspect >= 1.15;
  const isUltraTall = zones.height > zones.width * 1.55;

  let fontMax = usable * (isWide ? 0.2 : isUltraTall ? 0.13 : 0.17);
  if (density === 'long') fontMax *= 0.92;
  if (density === 'extreme') fontMax *= 0.86;
  if (charCount > 200) fontMax *= 0.9;
  if (charCount > 320) fontMax *= 0.86;
  if (charCount > 450) fontMax *= 0.82;

  const fontMin =
    density === 'extreme'
      ? Math.max(6, Math.round(usable * 0.042))
      : Math.max(7, Math.round(usable * (density === 'long' ? 0.048 : 0.055)));

  return { fontMax: Math.round(fontMax), fontMin, usable };
}

function lhStepsFor(density: ZoneDensity): number[] {
  if (density === 'extreme') return LINE_HEIGHT_STEPS_EXTREME;
  if (density === 'long') return LINE_HEIGHT_STEPS_LONG;
  return LINE_HEIGHT_STEPS;
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
    quotePaddingTop: number;
    quoteFits: boolean;
    longQuoteMode: boolean;
    extremeQuoteMode: boolean;
    originalText: string;
    footerPx: number;
    usable: number;
  }
): ImageLayoutPlan {
  const fullTextVerified = validateFullText(opts.originalText, opts.lines);
  const fits =
    opts.quoteFits && fullTextVerified && opts.quoteBlockHeight <= opts.usable;

  return {
    zones,
    safe: toLegacySafe(zones),
    lines: opts.lines,
    quotePx: opts.quotePx,
    authorPx: opts.authorPx,
    logoPx: zones.logoPx,
    padX: zones.padX,
    padTop: Math.round(zones.headerHeight * (zones.density === 'extreme' ? 0.22 : 0.28)),
    padBottom: Math.max(6, Math.round(zones.footerHeight * 0.24)),
    footerPx: opts.footerPx,
    lineHeight: opts.lineHeight,
    lineHeightRatio: opts.lineHeightRatio,
    quoteBlockHeight: opts.quoteBlockHeight,
    quotePaddingTop: opts.quotePaddingTop,
    quoteFits: fits,
    longQuoteMode: opts.longQuoteMode,
    extremeQuoteMode: opts.extremeQuoteMode,
    fullTextVerified,
    gapQuoteAuthor: 0,
    authorBottomGap: 0,
  };
}

export function computeImageLayout(
  texto: string,
  autor: string,
  width: number,
  height: number
): ImageLayoutPlan {
  const clean = normalizeQuoteText(texto);
  const hasAuthor = Boolean(autor?.trim());

  const fontProbe = Math.round(height * 0.04);
  const density = resolveDensity(clean, width * 0.84, fontProbe);
  const longQuoteMode = density !== 'normal';
  const extremeQuoteMode = density === 'extreme';

  const zones = computeLayoutZones(width, height, hasAuthor, density);
  const authorPx = computeAuthorPx(autor, zones);
  const footerPx = computeFooterPx(height, 'Coleção', 'MMM-2026-00000001');
  const { fontMax, fontMin, usable } = fontBounds(zones, density, clean.length);
  const lhSteps = lhStepsFor(density);

  let best: ImageLayoutPlan | null = null;

  for (const lhRatio of lhSteps) {
    for (let quotePx = fontMax; quotePx >= fontMin; quotePx -= quotePx > 36 ? 2 : 1) {
      const lines = wrapQuoteFull(clean, zones.quoteWidth, quotePx);
      if (!validateFullText(clean, lines)) continue;

      const lineHeight = quotePx * lhRatio;
      const quoteBlockHeight = estimateRenderedBlockHeight(lines.length, quotePx, lineHeight);
      const quoteFits = quoteBlockHeight <= usable;
      const quotePaddingTop = quoteFits
        ? Math.max(0, Math.floor((usable - quoteBlockHeight) / 2))
        : 0;

      const candidate = buildPlan(zones, {
        lines,
        quotePx,
        authorPx,
        lineHeight,
        lineHeightRatio: lhRatio,
        quoteBlockHeight,
        quotePaddingTop,
        quoteFits,
        longQuoteMode,
        extremeQuoteMode,
        originalText: clean,
        footerPx,
        usable,
      });

      if (candidate.quoteFits) {
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

  if (best?.quoteFits) return best;

  const quotePx = fontMin;
  const lines = wrapQuoteFull(clean, zones.quoteWidth, quotePx);
  const lineHeight = quotePx * 1.0;
  const quoteBlockHeight = estimateRenderedBlockHeight(lines.length, quotePx, lineHeight);
  const quoteFits = quoteBlockHeight <= usable && validateFullText(clean, lines);

  return buildPlan(zones, {
    lines,
    quotePx,
    authorPx,
    lineHeight,
    lineHeightRatio: 1.0,
    quoteBlockHeight,
    quotePaddingTop: quoteFits ? Math.max(0, Math.floor((usable - quoteBlockHeight) / 2)) : 0,
    quoteFits,
    longQuoteMode: true,
    extremeQuoteMode,
    originalText: clean,
    footerPx,
    usable,
  });
}

/** Rodapé exportado (domínio · skin · série) — ~3× o tamanho exibido com escala 1.8. */
export const FOOTER_DISPLAY_SCALE = 5.4;

export function computeFooterFontSize(
  height: number,
  skinName: string,
  serial: string
): number {
  return Math.round(computeFooterPx(height, skinName, serial) * FOOTER_DISPLAY_SCALE);
}

export function computeFooterSkinFontSize(
  footerPx: number,
  skinName: string,
  columnWidthPx: number
): number {
  const minBrandPx = Math.max(10, Math.round(footerPx * 0.88));
  for (let px = footerPx; px >= minBrandPx; px -= 1) {
    const est = skinName.length * px * 0.48;
    if (est <= columnWidthPx) return px;
  }
  return minBrandPx;
}

export function assertLayoutReady(plan: ImageLayoutPlan): void {
  if (!plan.fullTextVerified) {
    throw new Error('Texto da frase incompleto no layout.');
  }
  if (!plan.quoteFits) {
    throw new Error(
      'A frase não cabe na zona de citação. Experimente Stories (9:16) ou Wallpaper.'
    );
  }
}

export function assertExportTextIntegrity(root: HTMLElement, originalText: string): void {
  if (root.getAttribute('data-mm-quote-fits') === '0') {
    throw new Error('Layout inválido: frase ultrapassa a zona de citação.');
  }

  const block = root.querySelector('blockquote');
  if (!block) return;
  const strip = (s: string) =>
    normalizeQuoteText(s)
      .replace(/[""''«»„"‚'']/g, '')
      .replace(/\s/g, '');
  const rendered = strip(block.textContent ?? '');
  const expected = strip(originalText);
  if (rendered !== expected && !rendered.includes(expected) && !expected.includes(rendered)) {
    throw new Error(
      `Texto incompleto na imagem (${rendered.length}/${expected.length} caracteres).`
    );
  }

  const authorEl = root.querySelector('[data-mm-author-zone]');
  const expectedAuthor = root.getAttribute('data-mm-author-expected');
  if (expectedAuthor && authorEl) {
    const normAuthor = (s: string) =>
      strip(s).replace(/^[-–—\s]+/, '').replace(/[-–—\s]+$/, '');
    const ra = normAuthor(authorEl.textContent ?? '');
    const ea = normAuthor(expectedAuthor);
    if (ea && ra !== ea && !ra.includes(ea) && !ea.includes(ra)) {
      throw new Error('Autor incompleto ou ausente na imagem.');
    }
  }
}
