/**
 * Quatro regiões fixas: HEADER → QUOTE → AUTHOR → FOOTER.
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
};

const SIDE_RATIO = 0.08;
const LOGO_MAX_RATIO = 0.085;

const DENSITY_RATIOS: Record<
  ZoneDensity,
  { header: number; footer: number; author: number; gap: number; logoScale: number }
> = {
  normal: { header: 0.108, footer: 0.102, author: 0.08, gap: 0.022, logoScale: 1 },
  long: { header: 0.098, footer: 0.096, author: 0.074, gap: 0.018, logoScale: 0.92 },
  extreme: { header: 0.08, footer: 0.088, author: 0.062, gap: 0.012, logoScale: 0.78 },
};

export function computeLayoutZones(
  width: number,
  height: number,
  hasAuthor: boolean,
  density: ZoneDensity = 'normal'
): LayoutZones {
  const r = DENSITY_RATIOS[density];
  const padX = Math.round(width * SIDE_RATIO);
  const headerHeight = Math.round(height * r.header);
  const footerHeight = Math.round(height * r.footer);
  const footerTop = height - footerHeight;
  const authorZoneHeight = hasAuthor
    ? Math.round(Math.max(64, height * r.author))
    : 0;
  const zoneGap = Math.round(Math.max(10, height * r.gap));

  const authorZoneTop = footerTop - authorZoneHeight;
  const quoteZoneTop = headerHeight + zoneGap;
  const quoteZoneBottom = authorZoneTop - zoneGap;
  const quoteZoneHeight = Math.max(Math.round(height * 0.18), quoteZoneBottom - quoteZoneTop);

  const logoPx = Math.round(
    Math.min(width * LOGO_MAX_RATIO, headerHeight * 0.55, 88) * r.logoScale
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
