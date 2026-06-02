/** Medição real do bounding box da frase vs QUOTE_ZONE (pré-export). */

export type QuoteBlockMeasure = {
  fits: boolean;
  topOk: boolean;
  bottomOk: boolean;
  zoneTop: number;
  zoneBottom: number;
  blockTop: number;
  blockBottom: number;
  domReliable: boolean;
};

const EDGE_SLACK_PX = 3;

function isZeroRect(top: number, bottom: number): boolean {
  return top === 0 && bottom === 0;
}

export function measureQuoteBlock(root: HTMLElement): QuoteBlockMeasure | null {
  const zone = root.querySelector('[data-mm-quote-zone]');
  const block = root.querySelector('blockquote');
  if (!zone || !block) return null;

  const zr = zone.getBoundingClientRect();
  const br = block.getBoundingClientRect();

  const domReliable = !isZeroRect(br.top, br.bottom) && !isZeroRect(zr.top, zr.bottom);

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
    domReliable,
  };
}

export function assertQuoteBlockFits(root: HTMLElement): void {
  const m = measureQuoteBlock(root);
  if (!m?.domReliable) {
    exportDebugMeasure('dom-unreliable-skip', { quoteFits: root.getAttribute('data-mm-quote-fits') });
    return;
  }

  if (!m.fits && import.meta.env.DEV) {
    exportDebugMeasure('dom-overflow-dev-only', {
      topOk: m.topOk,
      bottomOk: m.bottomOk,
      quoteFits: root.getAttribute('data-mm-quote-fits'),
    });
  }
}

function exportDebugMeasure(step: string, detail?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem('mm-export-debug') === '1' || import.meta.env.DEV) {
      console.info('[mm-export]', step, detail ?? '');
    }
  } catch {
    /* ignore */
  }
}
