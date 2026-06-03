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

/** Menor fonte da citação — usada no encaixe forçado para textos longos. */
export const ABSOLUTE_MIN_QUOTE_PX = 4;
const FORCE_FIT_LH_RATIOS = [1.0, 0.98, 0.95, 0.92, 0.9, 0.88];

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
  footerSerialPx: number;
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

function computeFooterPx(width: number): number {
  return computeFooterFontSize(width);
}

function computeFooterSerialPx(width: number): number {
  return computeFooterSerialFontSize(width);
}

function computeAuthorPx(autor: string, zones: LayoutZones): number {
  if (!autor.trim() || zones.authorZoneHeight <= 0) return 0;
  const widthScale = zones.width / 1080;
  const heightCap = Math.round(42 * widthScale);
  const heightMin = Math.max(28, Math.round(32 * widthScale));
  const cap = zones.density === 'extreme' ? 0.38 : 0.42;
  const zoneMax = Math.round(zones.authorZoneHeight * cap);
  const maxPx = Math.min(zoneMax, heightCap);
  const minPx = Math.max(heightMin, zones.density === 'extreme' ? Math.round(28 * widthScale) : heightMin);
  const maxWidth = zones.quoteWidth * 0.7;
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

  let fontMax = usable * (isWide ? 0.2 : isUltraTall ? 0.145 : 0.17);
  if (isUltraTall && charCount <= 120) {
    fontMax = Math.max(fontMax, Math.round(zones.width * 0.092));
  }
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

type QuoteLayoutCandidate = {
  lines: string[];
  quotePx: number;
  lineHeight: number;
  lineHeightRatio: number;
  quoteBlockHeight: number;
  quotePaddingTop: number;
  blockFitsZone: boolean;
};

function findFittingQuoteLayout(
  clean: string,
  zones: LayoutZones,
  usable: number,
  fontMax: number
): QuoteLayoutCandidate {
  for (const lhRatio of FORCE_FIT_LH_RATIOS) {
    for (let quotePx = fontMax; quotePx >= ABSOLUTE_MIN_QUOTE_PX; quotePx -= 1) {
      const lines = wrapQuoteFull(clean, zones.quoteWidth, quotePx);
      if (!validateFullText(clean, lines)) continue;

      const lineHeight = quotePx * lhRatio;
      const quoteBlockHeight = estimateRenderedBlockHeight(lines.length, quotePx, lineHeight);
      if (quoteBlockHeight <= usable) {
        return {
          lines,
          quotePx,
          lineHeight,
          lineHeightRatio: lhRatio,
          quoteBlockHeight,
          quotePaddingTop: Math.max(0, Math.floor((usable - quoteBlockHeight) / 2)),
          blockFitsZone: true,
        };
      }
    }
  }

  const quotePx = ABSOLUTE_MIN_QUOTE_PX;
  const lhRatio = 0.88;
  const lines = wrapQuoteFull(clean, zones.quoteWidth, quotePx);
  const lineHeight = quotePx * lhRatio;
  const quoteBlockHeight = estimateRenderedBlockHeight(lines.length, quotePx, lineHeight);

  return {
    lines,
    quotePx,
    lineHeight,
    lineHeightRatio: lhRatio,
    quoteBlockHeight,
    quotePaddingTop: 0,
    blockFitsZone: quoteBlockHeight <= usable,
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
    footerSerialPx: number;
    usable: number;
    forceFit?: boolean;
  }
): ImageLayoutPlan {
  const fullTextVerified = validateFullText(opts.originalText, opts.lines);
  const fits =
    opts.forceFit ||
    (opts.quoteFits && fullTextVerified && opts.quoteBlockHeight <= opts.usable);

  return {
    zones,
    safe: toLegacySafe(zones),
    lines: opts.lines,
    quotePx: opts.quotePx,
    authorPx: opts.authorPx,
    logoPx: zones.logoPx,
    padX: zones.padX,
    padTop: Math.round(zones.headerHeight * (zones.density === 'extreme' ? 0.22 : 0.28)),
    padBottom: Math.max(32, Math.round(40 * (zones.width / 1080))),
    footerPx: opts.footerPx,
    footerSerialPx: opts.footerSerialPx,
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
  const footerPx = computeFooterPx(width);
  const footerSerialPx = computeFooterSerialPx(width);
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
        footerSerialPx,
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

  const forced = findFittingQuoteLayout(clean, zones, usable, fontMax);

  return buildPlan(zones, {
    lines: forced.lines,
    quotePx: forced.quotePx,
    authorPx,
    lineHeight: forced.lineHeight,
    lineHeightRatio: forced.lineHeightRatio,
    quoteBlockHeight: forced.quoteBlockHeight,
    quotePaddingTop: forced.quotePaddingTop,
    quoteFits: forced.blockFitsZone,
    forceFit: true,
    longQuoteMode: true,
    extremeQuoteMode,
    originalText: clean,
    footerPx,
    footerSerialPx,
    usable,
  });
}

/** Metadados do rodapé Soft Premium — escala pela largura (1080 = referência). */
export const FOOTER_META_AT_1080 = 18;
export const FOOTER_SERIAL_AT_1080 = 16;
export const FOOTER_META_MIN_PX = 16;
export const FOOTER_META_MAX_PX = 22;
export const FOOTER_SERIAL_MIN_PX = 14;
export const FOOTER_SERIAL_MAX_PX = 20;

/** @deprecated */
export const FOOTER_METADATA_MIN_PX = FOOTER_META_MIN_PX;
export const FOOTER_METADATA_MAX_PX = FOOTER_META_MAX_PX;
export const FOOTER_METADATA_HEIGHT_RATIO = FOOTER_META_AT_1080 / 1080;
export const FOOTER_HEIGHT_RATIO = FOOTER_METADATA_HEIGHT_RATIO;
export const FOOTER_MIN_PX = FOOTER_META_MIN_PX;
export const FOOTER_MAX_PX = FOOTER_META_MAX_PX;

export function computeFooterFontSize(width: number): number {
  const px = Math.round(FOOTER_META_AT_1080 * (width / 1080));
  return Math.min(FOOTER_META_MAX_PX, Math.max(FOOTER_META_MIN_PX, px));
}

export function computeFooterSerialFontSize(width: number): number {
  const px = Math.round(FOOTER_SERIAL_AT_1080 * (width / 1080));
  return Math.min(FOOTER_SERIAL_MAX_PX, Math.max(FOOTER_SERIAL_MIN_PX, px));
}

/** Trunca rótulo longo do rodapé (serial, skin) com reticências. */
export function truncateFooterLabel(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (maxChars <= 0 || trimmed.length <= maxChars) return trimmed;
  if (maxChars <= 3) return trimmed.slice(0, maxChars);
  return `${trimmed.slice(0, maxChars - 3)}...`;
}

export function maxFooterLabelChars(
  columnWidthPx: number,
  fontPx: number,
  charWidthRatio = 0.52
): number {
  return Math.max(4, Math.floor(columnWidthPx / Math.max(1, fontPx * charWidthRatio)));
}

/** @deprecated Shrink loop substituído por truncamento CSS + maxFooterLabelChars. */
export function computeFooterSkinFontSize(
  footerPx: number,
  _skinName: string,
  _columnWidthPx: number
): number {
  return footerPx;
}

export function assertLayoutReady(plan: ImageLayoutPlan): void {
  if (!plan.fullTextVerified) {
    throw new Error('Texto da frase incompleto no layout.');
  }
}

export function assertExportTextIntegrity(root: HTMLElement, originalText: string): void {
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
