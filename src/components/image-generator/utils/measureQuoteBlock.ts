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
  if (root.getAttribute('data-mm-quote-fits') === '0') {
    throw new Error('Layout inválido: frase ultrapassa a zona de citação.');
  }

  const m = measureQuoteBlock(root);
  if (!m) {
    if (root.getAttribute('data-mm-quote-fits') === '1') return;
    throw new Error('Não foi possível medir a zona da citação.');
  }

  if (!m.domReliable) {
    exportDebugMeasure('dom-unreliable-skip', { quoteFits: root.getAttribute('data-mm-quote-fits') });
    return;
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
