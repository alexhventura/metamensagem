/** Layout por zonas — medição conservadora; LONG/EXTREME; sem truncar. */
import type { ImageFontId } from '../fonts';
import { computeLayoutZones, type LayoutZones, type ZoneDensity, resolveFooterFormatProfile } from './safeZone';

export const LONG_QUOTE_CHAR_THRESHOLD = 150;
export const EXTREME_QUOTE_CHAR_THRESHOLD = 300;
export const LONG_QUOTE_MIN_LINES = 5;

/** Largura máxima do bloco de citação (centro editorial). */
export const QUOTE_CONTENT_MAX_WIDTH_RATIO = 0.82;

/** Margem interna da QUOTE_ZONE (topo + base + laterais). */
export const QUOTE_ZONE_INNER_PAD = 10;

export type ImageLayoutOptions = {
  fontId?: ImageFontId;
};

const FONT_WIDTH_SCALE: Record<ImageFontId, number> = {
  inter: 1,
  montserrat: 1.04,
  playfair: 1.12,
  poppins: 1.05,
  merriweather: 1.1,
  lora: 1.08,
};

/** Largura média por caractere (font-weight 700) — conservador para evitar re-wrap no DOM. */
const BOLD_CHAR_WIDTH_RATIO = 0.62;
/** Fator de segurança na contagem de caracteres por linha. */
const WRAP_CHARS_SAFETY = 0.94;

/** Boost de fonte para frases curtas (≤3 linhas). */
const SHORT_QUOTE_FONT_BOOST = 1.08;
const MEDIUM_QUOTE_FONT_SCALE = 0.94;
const AUTHOR_SIZE_BOOST = 1.18;

export function effectiveQuoteWidth(quoteWidthPx: number): number {
  return Math.round(quoteWidthPx * QUOTE_CONTENT_MAX_WIDTH_RATIO);
}
/** Slack por linha (ascendentes/descendentes reais vs. métrica teórica). */
const LINE_METRICS_EXTRA_RATIO = 0.18;
/** Espaço extra para aspas tipográficas. */
const QUOTE_MARKS_EXTRA_RATIO = 0.14;
/** Margem de segurança vs. render real (spans block, sombra, tracking). */
const HEIGHT_ESTIMATE_SAFETY = 1.08;

const LINE_HEIGHT_STEPS = [1.55, 1.45, 1.38, 1.32, 1.26, 1.2, 1.16, 1.14, 1.12];
const LINE_HEIGHT_STEPS_LONG = [1.38, 1.32, 1.26, 1.2, 1.16, 1.14, 1.12];
const LINE_HEIGHT_STEPS_EXTREME = [1.28, 1.24, 1.2, 1.16, 1.14, 1.12];

/** Menor line-height permitido — abaixo disso glifos bold se sobrepõem. */
export const MIN_LINE_HEIGHT_RATIO = 1.12;

/** Menor fonte da citação — usada no encaixe forçado para textos longos. */
export const ABSOLUTE_MIN_QUOTE_PX = 4;
const FORCE_FIT_LH_RATIOS = [1.28, 1.24, 1.2, 1.16, 1.14, MIN_LINE_HEIGHT_RATIO];

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
  quotePaddingBottom: number;
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

function resolveFontWidthScale(fontId?: ImageFontId): number {
  if (!fontId) return 1.06;
  return FONT_WIDTH_SCALE[fontId] * 1.06;
}

function charWidthPx(fontPx: number, fontWidthScale: number): number {
  return fontPx * BOLD_CHAR_WIDTH_RATIO * fontWidthScale;
}

function maxCharsPerLine(quoteWidthPx: number, fontPx: number, fontWidthScale: number): number {
  const raw = quoteWidthPx / charWidthPx(fontPx, fontWidthScale);
  return Math.max(6, Math.floor(raw * WRAP_CHARS_SAFETY));
}

function splitOversizedWord(word: string, maxChars: number): string[] {
  if (word.length <= maxChars) return [word];
  const parts: string[] = [];
  for (let i = 0; i < word.length; i += maxChars) {
    parts.push(word.slice(i, i + maxChars));
  }
  return parts;
}

function greedyWrapWords(words: string[], maxChars: number): string[] {
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
  return lines.length ? lines : [''];
}

function lineBalanceScore(lines: string[]): number {
  if (lines.length <= 1) return 0;
  const lengths = lines.map((l) => l.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((s, l) => s + (l - avg) ** 2, 0) / lengths.length;
  let penalty = 0;
  for (const line of lines) {
    const words = line.split(' ').filter(Boolean);
    if (words.length === 1) penalty += 120;
    if (line.length < avg * 0.32 && lines.length > 2) penalty += 45;
  }
  if (lines.length >= 2) {
    const lastWords = lines[lines.length - 1].split(' ').filter(Boolean);
    const firstWords = lines[0].split(' ').filter(Boolean);
    if (lastWords.length === 1) penalty += 80;
    if (firstWords.length === 1 && lines.length > 2) penalty += 40;
  }
  return variance + penalty;
}

function fixOrphanLines(lines: string[]): string[] {
  const next = [...lines];
  if (next.length < 2) return next;

  const lastWords = next[next.length - 1].split(' ').filter(Boolean);
  if (lastWords.length === 1) {
    const prevWords = next[next.length - 2].split(' ').filter(Boolean);
    if (prevWords.length > 1) {
      const moved = prevWords.pop()!;
      next[next.length - 2] = prevWords.join(' ');
      next[next.length - 1] = `${moved} ${next[next.length - 1]}`;
    }
  }

  if (next.length >= 3) {
    const firstWords = next[0].split(' ').filter(Boolean);
    if (firstWords.length === 1) {
      const secondWords = next[1].split(' ').filter(Boolean);
      if (secondWords.length > 1) {
        const moved = secondWords.shift()!;
        next[0] = `${next[0]} ${moved}`;
        next[1] = secondWords.join(' ');
      }
    }
  }

  return next;
}

export function wrapQuoteFull(
  text: string,
  quoteWidthPx: number,
  fontPx: number,
  fontWidthScale = 1.06
): string[] {
  const clean = normalizeQuoteText(text);
  if (!clean) return [''];

  const words = clean.split(' ');
  const baseMax = maxCharsPerLine(quoteWidthPx, fontPx, fontWidthScale);

  let bestLines = greedyWrapWords(words, baseMax);
  let bestScore = lineBalanceScore(bestLines);

  for (let factor = 0.86; factor <= 1.1; factor += 0.04) {
    const targetMax = Math.max(6, Math.floor(baseMax * factor));
    const candidate = greedyWrapWords(words, targetMax);
    if (!validateFullText(clean, candidate)) continue;
    const score = lineBalanceScore(candidate);
    if (score < bestScore) {
      bestLines = candidate;
      bestScore = score;
    }
  }

  const balanced = fixOrphanLines(bestLines);
  return validateFullText(clean, balanced) ? balanced : bestLines;
}

function resolveDensity(
  text: string,
  quoteWidth: number,
  fontProbe: number,
  fontWidthScale: number
): ZoneDensity {
  if (text.length >= EXTREME_QUOTE_CHAR_THRESHOLD) return 'extreme';
  const probeLines = wrapQuoteFull(text, quoteWidth, fontProbe, fontWidthScale).length;
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
  return Math.ceil((lineCount * perLine + marks) * HEIGHT_ESTIMATE_SAFETY);
}

function computeFooterPx(width: number, height: number): number {
  return computeFooterFontSize(width, height);
}

function computeFooterSerialPx(width: number, height: number): number {
  return computeFooterSerialFontSize(width, height);
}

function computeFooterPadBottom(zones: LayoutZones): number {
  return Math.max(16, Math.round(zones.footerHeight * 0.2));
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
    if (est <= maxWidth) return Math.min(zoneMax, Math.round(px * AUTHOR_SIZE_BOOST));
  }
  return Math.min(zoneMax, Math.round(minPx * AUTHOR_SIZE_BOOST));
}

function fontBounds(
  zones: LayoutZones,
  density: ZoneDensity,
  charCount: number,
  formatProfile: ReturnType<typeof resolveFooterFormatProfile>
) {
  const usable = usableQuoteHeight(zones.quoteZoneHeight);
  const isUltraTall = formatProfile === 'story';

  let fontMax =
    formatProfile === 'portrait'
      ? usable * 0.21
      : formatProfile === 'story'
        ? usable * 0.195
        : usable * 0.2;

  if (isUltraTall && charCount <= 120) {
    fontMax = Math.max(fontMax, Math.round(zones.width * 0.096));
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

function quoteVerticalCenterRatio(formatProfile: ReturnType<typeof resolveFooterFormatProfile>): number {
  if (formatProfile === 'story') return 0.42;
  if (formatProfile === 'portrait') return 0.48;
  return 0.5;
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
  fontMax: number,
  fontWidthScale: number
): QuoteLayoutCandidate {
  const wrapWidth = effectiveQuoteWidth(zones.quoteWidth);
  for (const lhRatio of FORCE_FIT_LH_RATIOS) {
    for (let quotePx = fontMax; quotePx >= ABSOLUTE_MIN_QUOTE_PX; quotePx -= 1) {
      const lines = wrapQuoteFull(clean, wrapWidth, quotePx, fontWidthScale);
      if (!validateFullText(clean, lines)) continue;

      const lineHeight = quotePx * lhRatio;
      const quoteBlockHeight = estimateRenderedBlockHeight(lines.length, quotePx, lineHeight);
      if (quoteBlockHeight <= usable) {
        const centerRatio = quoteVerticalCenterRatio(zones.formatProfile);
        return {
          lines,
          quotePx,
          lineHeight,
          lineHeightRatio: lhRatio,
          quoteBlockHeight,
          quotePaddingTop: Math.max(0, Math.floor((usable - quoteBlockHeight) * centerRatio)),
          blockFitsZone: true,
        };
      }
    }
  }

  const quotePx = ABSOLUTE_MIN_QUOTE_PX;
  const lhRatio = MIN_LINE_HEIGHT_RATIO;
  const lines = wrapQuoteFull(clean, wrapWidth, quotePx, fontWidthScale);
  const lineHeight = quotePx * lhRatio;
  const quoteBlockHeight = estimateRenderedBlockHeight(lines.length, quotePx, lineHeight);

  return {
    lines,
    quotePx,
    lineHeight,
    lineHeightRatio: lhRatio,
    quoteBlockHeight,
    quotePaddingTop: Math.max(
      0,
      Math.floor((usable - quoteBlockHeight) * quoteVerticalCenterRatio(zones.formatProfile))
    ),
    blockFitsZone: quoteBlockHeight <= usable,
  };
}

function shortQuoteFontScale(lineCount: number): number {
  if (lineCount <= 3) return SHORT_QUOTE_FONT_BOOST;
  if (lineCount <= 5) return 1;
  if (lineCount <= 8) return MEDIUM_QUOTE_FONT_SCALE;
  return 1;
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
    quotePaddingBottom: number;
    quoteFits: boolean;
    longQuoteMode: boolean;
    extremeQuoteMode: boolean;
    originalText: string;
    footerPx: number;
    footerSerialPx: number;
    usable: number;
  }
): ImageLayoutPlan {
  const fullTextVerified = validateFullText(opts.originalText, opts.lines);
  const fits = opts.quoteFits && fullTextVerified && opts.quoteBlockHeight <= opts.usable;

  return {
    zones,
    safe: toLegacySafe(zones),
    lines: opts.lines,
    quotePx: opts.quotePx,
    authorPx: opts.authorPx,
    logoPx: zones.logoPx,
    padX: zones.padX,
    padTop: Math.round(zones.headerHeight * (zones.density === 'extreme' ? 0.16 : 0.2)),
    padBottom: computeFooterPadBottom(zones),
    footerPx: opts.footerPx,
    footerSerialPx: opts.footerSerialPx,
    lineHeight: opts.lineHeight,
    lineHeightRatio: opts.lineHeightRatio,
    quoteBlockHeight: opts.quoteBlockHeight,
    quotePaddingTop: opts.quotePaddingTop,
    quotePaddingBottom: opts.quotePaddingBottom,
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
  height: number,
  options: ImageLayoutOptions = {}
): ImageLayoutPlan {
  const clean = normalizeQuoteText(texto);
  const hasAuthor = Boolean(autor?.trim());
  const fontWidthScale = resolveFontWidthScale(options.fontId);

  const fontProbe = Math.round(height * 0.04);
  const probeZones = computeLayoutZones(width, height, hasAuthor, 'normal');
  const densityProbeWidth = effectiveQuoteWidth(probeZones.quoteWidth);
  const density = resolveDensity(clean, densityProbeWidth, fontProbe, fontWidthScale);
  const longQuoteMode = density !== 'normal';
  const extremeQuoteMode = density === 'extreme';

  const zones = computeLayoutZones(width, height, hasAuthor, density);
  const formatProfile = zones.formatProfile;
  const centerRatio = quoteVerticalCenterRatio(formatProfile);
  const authorPx = computeAuthorPx(autor, zones);
  const footerPx = computeFooterPx(width, height);
  const footerSerialPx = computeFooterSerialPx(width, height);
  const wrapWidth = effectiveQuoteWidth(zones.quoteWidth);
  const { fontMax: fontMaxBase, fontMin, usable } = fontBounds(
    zones,
    density,
    clean.length,
    formatProfile
  );
  const probeLines = wrapQuoteFull(clean, wrapWidth, fontMaxBase, fontWidthScale).length;
  const fontMax = Math.round(fontMaxBase * shortQuoteFontScale(probeLines));
  const lhSteps = lhStepsFor(density);
  const quotePaddingBottom = QUOTE_ZONE_INNER_PAD;

  let best: ImageLayoutPlan | null = null;

  for (const lhRatio of lhSteps) {
    for (let quotePx = fontMax; quotePx >= fontMin; quotePx -= quotePx > 36 ? 2 : 1) {
      const lines = wrapQuoteFull(clean, wrapWidth, quotePx, fontWidthScale);
      if (!validateFullText(clean, lines)) continue;

      const lineHeight = quotePx * lhRatio;
      const quoteBlockHeight = estimateRenderedBlockHeight(lines.length, quotePx, lineHeight);
      const quoteFits = quoteBlockHeight <= usable;
      const quotePaddingTop = quoteFits
        ? Math.max(0, Math.floor((usable - quoteBlockHeight) * centerRatio))
        : 0;

      const candidate = buildPlan(zones, {
        lines,
        quotePx,
        authorPx,
        lineHeight,
        lineHeightRatio: lhRatio,
        quoteBlockHeight,
        quotePaddingTop,
        quotePaddingBottom,
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

  const forced = findFittingQuoteLayout(clean, zones, usable, fontMax, fontWidthScale);

  return buildPlan(zones, {
    lines: forced.lines,
    quotePx: forced.quotePx,
    authorPx,
    lineHeight: forced.lineHeight,
    lineHeightRatio: forced.lineHeightRatio,
    quoteBlockHeight: forced.quoteBlockHeight,
    quotePaddingTop: forced.quotePaddingTop,
    quotePaddingBottom,
    quoteFits: forced.blockFitsZone,
    longQuoteMode: true,
    extremeQuoteMode,
    originalText: clean,
    footerPx,
    footerSerialPx,
    usable,
  });
}

/** Metadados do rodapé Soft Premium Signature — responsivo por proporção do canvas. */
export const FOOTER_META_MIN_PX = 20;
export const FOOTER_META_MAX_PX = 28;
export const FOOTER_SERIAL_MIN_PX = 18;
export const FOOTER_SERIAL_MAX_PX = 24;

const FOOTER_META_BY_PROFILE: Record<
  ReturnType<typeof resolveFooterFormatProfile>,
  number
> = {
  square: 20,
  portrait: 22,
  story: 24,
  horizontal: 26,
  default: 22,
};

/** Categoria humanizada para rodapé V3 (Categoria ◈ Serial). */
export function formatFooterCategory(raw?: string | null): string {
  const s = (raw ?? '').trim();
  if (!s) return 'Frase';
  const human = s
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();
  if (!human) return 'Frase';
  return human.charAt(0).toUpperCase() + human.slice(1).toLowerCase().slice(0, 23);
}

/** Serial compacto para rodapé (ex.: MTA-2026-48392). */
export function formatSerialCompact(serial: string): string {
  const parts = serial.split('-');
  if (parts.length >= 3 && parts[0] === 'MMM') {
    const year = parts[1];
    const seq = parseInt(parts[2], 10);
    if (Number.isFinite(seq) && seq > 0) {
      return `MTA-${year}-${String(seq % 100000).padStart(5, '0')}`;
    }
  }
  const digits = serial.replace(/\D/g, '');
  const seq = parseInt(digits.slice(-5) || '0', 10);
  return `MTA-${seq || 0}`;
}

/** Rodapé unificado: metamensagem.com • MTA-48392 */
export function formatFooterSignature(serial: string): string {
  return `metamensagem.com • ${formatSerialCompact(serial)}`;
}

/** @deprecated Use formatFooterSignature */
export function formatFooterMetaLine(_category: string, serial: string): string {
  return formatFooterSignature(serial);
}

/** @deprecated */
export const FOOTER_META_AT_1080 = 18;
/** @deprecated */
export const FOOTER_SERIAL_AT_1080 = 16;
/** @deprecated */
export const FOOTER_METADATA_MIN_PX = FOOTER_META_MIN_PX;
/** @deprecated */
export const FOOTER_METADATA_MAX_PX = FOOTER_META_MAX_PX;
export const FOOTER_METADATA_HEIGHT_RATIO = 0.08;
export const FOOTER_HEIGHT_RATIO = FOOTER_METADATA_HEIGHT_RATIO;
/** @deprecated */
export const FOOTER_MIN_PX = FOOTER_META_MIN_PX;
/** @deprecated */
export const FOOTER_MAX_PX = FOOTER_META_MAX_PX;

export { resolveFooterFormatProfile } from './safeZone';

export function computeFooterFontSize(width: number, height: number): number {
  const profile = resolveFooterFormatProfile(width, height);
  const target = FOOTER_META_BY_PROFILE[profile];
  const shortest = Math.min(width, height);
  const proportional = Math.round(shortest * 0.018);
  return Math.min(FOOTER_META_MAX_PX, Math.max(FOOTER_META_MIN_PX, target, proportional));
}

export function computeFooterSerialFontSize(width: number, height: number): number {
  const meta = computeFooterFontSize(width, height);
  const px = Math.round(meta * 0.88);
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
