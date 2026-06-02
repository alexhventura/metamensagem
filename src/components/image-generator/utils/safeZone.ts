/**
 * Quatro regiões fixas: HEADER → QUOTE (dinâmica) → AUTHOR → FOOTER.
 * A frase só existe em QUOTE_ZONE; autor e rodapé nunca são empurrados.
 */

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
};

const SIDE_RATIO = 0.08;
const HEADER_RATIO = 0.111;
const FOOTER_RATIO = 0.074;
const AUTHOR_ZONE_RATIO = 0.083;
const ZONE_GAP_RATIO = 0.022;
const LOGO_MAX_RATIO = 0.085;

export function computeLayoutZones(
  width: number,
  height: number,
  hasAuthor: boolean
): LayoutZones {
  const padX = Math.round(width * SIDE_RATIO);
  const headerHeight = Math.round(height * HEADER_RATIO);
  const footerHeight = Math.round(height * FOOTER_RATIO);
  const footerTop = height - footerHeight;
  const authorZoneHeight = hasAuthor
    ? Math.round(Math.max(72, height * AUTHOR_ZONE_RATIO))
    : 0;
  const zoneGap = Math.round(Math.max(12, height * ZONE_GAP_RATIO));

  const authorZoneTop = footerTop - authorZoneHeight;
  const quoteZoneTop = headerHeight + zoneGap;
  const quoteZoneBottom = authorZoneTop - zoneGap;
  const quoteZoneHeight = Math.max(Math.round(height * 0.2), quoteZoneBottom - quoteZoneTop);

  const logoPx = Math.round(Math.min(width * LOGO_MAX_RATIO, headerHeight * 0.55, 88));

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
  };
}

/** @deprecated Use computeLayoutZones */
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
