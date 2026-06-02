/** Medição real do bounding box da frase vs QUOTE_ZONE (pré-export). */

export type QuoteBlockMeasure = {
  fits: boolean;
  topOk: boolean;
  bottomOk: boolean;
  zoneTop: number;
  zoneBottom: number;
  blockTop: number;
  blockBottom: number;
};

const EDGE_SLACK_PX = 3;

export function measureQuoteBlock(root: HTMLElement): QuoteBlockMeasure | null {
  const zone = root.querySelector('[data-mm-quote-zone]');
  const block = root.querySelector('blockquote');
  if (!zone || !block) return null;

  const zr = zone.getBoundingClientRect();
  const br = block.getBoundingClientRect();

  const zoneTop = zr.top;
  const zoneBottom = zr.bottom;
  const topOk = br.top >= zoneTop - EDGE_SLACK_PX;
  const bottomOk = br.bottom <= zoneBottom + EDGE_SLACK_PX;

  return {
    fits: topOk && bottomOk,
    topOk,
    bottomOk,
    zoneTop,
    zoneBottom,
    blockTop: br.top,
    blockBottom: br.bottom,
  };
}

export function assertQuoteBlockFits(root: HTMLElement): void {
  const m = measureQuoteBlock(root);
  if (!m) {
    throw new Error('Não foi possível medir a zona da citação.');
  }
  if (!m.fits) {
    const parts: string[] = [];
    if (!m.topOk) parts.push('corte superior');
    if (!m.bottomOk) parts.push('corte inferior');
    throw new Error(
      `Frase fora da área útil (${parts.join(' e ')}). Ajuste o formato ou tente novamente.`
    );
  }
}
