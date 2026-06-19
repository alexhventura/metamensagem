/**
 * Quatro regiões fixas: HEADER → QUOTE → AUTHOR → FOOTER.
 * Proporções calibradas por formato (1:1, 4:5, 9:16).
 */
export type ZoneDensity = 'normal' | 'long' | 'extreme';

export type LayoutZones = {
  width: number;
  height: number;
  padX: number;
  logoPx: number;
  headerHeight: number;
  quoteZoneTop: number;
  quoteZoneHeight: number;
  quoteWidth: number;
  authorZoneTop: number;
  authorZoneHeight: number;
  footerTop: number;
  footerHeight: number;
  density: ZoneDensity;
  formatProfile: FooterFormatProfile;
};

const SIDE_RATIO = 0.09;
const LOGO_MAX_RATIO = 0.078;

export type FooterFormatProfile = 'square' | 'portrait' | 'story' | 'horizontal' | 'default';

const FORMAT_ZONE_BASE: Record<
  FooterFormatProfile,
  { header: number; footer: number; author: number; gap: number; logoScale: number }
> = {
  square: { header: 0.064, footer: 0.052, author: 0.068, gap: 0.012, logoScale: 0.88 },
  portrait: { header: 0.058, footer: 0.048, author: 0.062, gap: 0.01, logoScale: 0.86 },
  story: { header: 0.048, footer: 0.044, author: 0.056, gap: 0.008, logoScale: 0.84 },
  horizontal: { header: 0.064, footer: 0.052, author: 0.068, gap: 0.012, logoScale: 0.88 },
  default: { header: 0.058, footer: 0.048, author: 0.062, gap: 0.01, logoScale: 0.86 },
};

const DENSITY_SHRINK: Record<
  ZoneDensity,
  { header: number; author: number; footer: number; gap: number; logoScale: number }
> = {
  normal: { header: 1, author: 1, footer: 1, gap: 1, logoScale: 1 },
  long: { header: 0.94, author: 0.96, footer: 0.96, gap: 0.92, logoScale: 0.92 },
  extreme: { header: 0.88, author: 0.92, footer: 0.94, gap: 0.86, logoScale: 0.82 },
};

const FOOTER_MIN_HEIGHT_PX = 64;

export function resolveFooterFormatProfile(width: number, height: number): FooterFormatProfile {
  const aspect = width / height;
  if (aspect >= 1.35) return 'horizontal';
  if (height >= width * 1.55) return 'story';
  if (height >= width * 1.12) return 'portrait';
  if (aspect >= 0.92 && aspect <= 1.08) return 'square';
  return 'default';
}

function footerHeightForCanvas(
  height: number,
  profile: FooterFormatProfile,
  density: ZoneDensity
): number {
  const base = FORMAT_ZONE_BASE[profile] ?? FORMAT_ZONE_BASE.default;
  const shrink = DENSITY_SHRINK[density];
  const ratio = base.footer * shrink.footer;
  return Math.max(FOOTER_MIN_HEIGHT_PX, Math.round(height * ratio));
}

export function computeLayoutZones(
  width: number,
  height: number,
  hasAuthor: boolean,
  density: ZoneDensity = 'normal'
): LayoutZones {
  const formatProfile = resolveFooterFormatProfile(width, height);
  const base = FORMAT_ZONE_BASE[formatProfile] ?? FORMAT_ZONE_BASE.default;
  const shrink = DENSITY_SHRINK[density];

  const padX = Math.round(width * SIDE_RATIO);
  const headerHeight = Math.round(height * base.header * shrink.header);
  const footerHeight = footerHeightForCanvas(height, formatProfile, density);
  const footerTop = height - footerHeight;
  const authorZoneHeight = hasAuthor
    ? Math.round(Math.max(56, height * base.author * shrink.author))
    : 0;
  const zoneGap = Math.round(Math.max(8, height * base.gap * shrink.gap));

  const authorZoneTop = footerTop - authorZoneHeight;
  const quoteZoneTop = headerHeight + zoneGap;
  const quoteZoneBottom = authorZoneTop - zoneGap;
  const naturalQuoteHeight = Math.max(0, quoteZoneBottom - quoteZoneTop);
  const quoteZoneHeight = naturalQuoteHeight;

  const logoPx = Math.round(
    Math.min(width * LOGO_MAX_RATIO, headerHeight * 0.62, 84) * base.logoScale * shrink.logoScale
  );

  return {
    width,
    height,
    padX,
    logoPx,
    headerHeight,
    quoteZoneTop,
    quoteZoneHeight,
    quoteWidth: width - padX * 2,
    authorZoneTop,
    authorZoneHeight,
    footerTop,
    footerHeight,
    density,
    formatProfile,
  };
}

/** @deprecated */
export type SafeZoneMetrics = LayoutZones & {
  quoteTop: number;
  quoteBottom: number;
  quoteHeight: number;
};

export function computeSafeZone(width: number, height: number): SafeZoneMetrics {
  const zones = computeLayoutZones(width, height, true);
  return {
    ...zones,
    quoteTop: zones.quoteZoneTop,
    quoteBottom: zones.authorZoneTop,
    quoteHeight: zones.quoteZoneHeight,
  };
}
