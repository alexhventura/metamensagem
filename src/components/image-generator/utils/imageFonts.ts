const FONT_LINK_ID = 'mm-image-export-fonts';

export function quoteNeedsCjkFont(text: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(text);
}

export function quoteNeedsDevanagariFont(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export function imageFontFamilyFor(text: string, autor: string): string {
  const sample = `${text}\n${autor}`;
  const parts: string[] = [];
  if (quoteNeedsDevanagariFont(sample)) {
    parts.push('"Noto Sans Devanagari"');
  }
  if (quoteNeedsCjkFont(sample)) {
    parts.push('"Noto Sans JP"');
  }
  parts.push('Inter', 'ui-sans-serif', 'system-ui', 'sans-serif');
  return parts.join(', ');
}

/** Garante glifos JA/HI antes do html-to-image (evita tofu em PNG/JPG/share). */
export async function ensureImageExportFonts(text: string, autor: string): Promise<void> {
  const sample = `${text}\n${autor}`;
  const needJa = quoteNeedsCjkFont(sample);
  const needHi = quoteNeedsDevanagariFont(sample);
  if (!needJa && !needHi) return;

  const families: string[] = [];
  if (needJa) families.push('Noto+Sans+JP:wght@400;700');
  if (needHi) families.push('Noto+Sans+Devanagari:wght@400;700');

  if (!document.getElementById(FONT_LINK_ID)) {
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${families.join('&family=')}&display=swap`;
    document.head.appendChild(link);
    await new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
      window.setTimeout(resolve, 1200);
    });
  }

  if (document.fonts?.load) {
    const loads: Promise<FontFace[]>[] = [];
    if (needJa) {
      loads.push(document.fonts.load('700 24px "Noto Sans JP"'));
      loads.push(document.fonts.load('400 16px "Noto Sans JP"'));
    }
    if (needHi) {
      loads.push(document.fonts.load('700 24px "Noto Sans Devanagari"'));
      loads.push(document.fonts.load('400 16px "Noto Sans Devanagari"'));
    }
    await Promise.allSettled(loads);
  }
  await document.fonts?.ready;
}
