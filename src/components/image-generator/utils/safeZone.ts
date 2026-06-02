/**
 * Safe zones obrigatórias — área da frase nunca invade logo nem rodapé.
 */

export type SafeZoneMetrics = {
  width: number;
  height: number;
  padX: number;
  headerHeight: number;
  footerHeight: number;
  quoteTop: number;
  quoteBottom: number;
  quoteHeight: number;
  quoteWidth: number;
  logoPx: number;
};

/** Proporções Soft Premium (editorial). */
const HEADER_RATIO = 0.11;
const FOOTER_RATIO = 0.075;
const SIDE_RATIO = 0.08;
const LOGO_MAX_RATIO = 0.085;

export function computeSafeZone(width: number, height: number): SafeZoneMetrics {
  const padX = Math.round(width * SIDE_RATIO);
  const headerHeight = Math.round(height * HEADER_RATIO);
  const footerHeight = Math.round(height * FOOTER_RATIO);
  const logoPx = Math.round(Math.min(width * LOGO_MAX_RATIO, headerHeight * 0.55, 88));

  const quoteTop = headerHeight;
  const quoteBottom = height - footerHeight;
  const quoteHeight = Math.max(height * 0.28, quoteBottom - quoteTop);
  const quoteWidth = width - padX * 2;

  return {
    width,
    height,
    padX,
    headerHeight,
    footerHeight,
    quoteTop,
    quoteBottom,
    quoteHeight,
    quoteWidth,
    logoPx,
  };
}
