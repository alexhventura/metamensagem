import {
  findImageFont,
  imageFontFamilyForChoice,
  type ImageFontId,
} from '../fonts';

const FONT_LINK_ID = 'mm-image-export-fonts';
const PICKER_FONT_LINK_ID = 'mm-image-picker-fonts';

export function quoteNeedsCjkFont(text: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(text);
}

export function quoteNeedsDevanagariFont(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export function imageFontFamilyFor(text: string, autor: string, fontId?: ImageFontId): string {
  if (fontId) return imageFontFamilyForChoice(fontId, text, autor);
  const sample = `${text}\n${autor}`;
  const parts: string[] = [];
  if (quoteNeedsDevanagariFont(sample)) parts.push('"Noto Sans Devanagari"');
  if (quoteNeedsCjkFont(sample)) parts.push('"Noto Sans JP"');
  parts.push('Inter', 'ui-sans-serif', 'system-ui', 'sans-serif');
  return parts.join(', ');
}

async function loadGoogleFontLink(linkId: string, families: string[]): Promise<void> {
  if (families.length === 0) return;
  let link = document.getElementById(linkId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = `https://fonts.googleapis.com/css2?family=${families.join('&family=')}&display=swap`;
  await new Promise<void>((resolve) => {
    link!.onload = () => resolve();
    link!.onerror = () => resolve();
    window.setTimeout(resolve, 1200);
  });
}

/** Pré-carrega fontes do seletor mobile (somente a fonte ativa por padrão). */
export async function ensurePickerFontsLoaded(fontId?: ImageFontId): Promise<void> {
  const active = fontId ? findImageFont(fontId) : findImageFont('inter');
  await loadGoogleFontLink(PICKER_FONT_LINK_ID, [active.google]);

  if (document.fonts?.load) {
    const fam = active.family.split(',')[0];
    await Promise.allSettled([
      document.fonts.load(`700 20px ${fam}`),
      document.fonts.load(`400 16px ${fam}`),
      document.fonts.load(`700 24px ${fam}`),
    ]);
  }
  await document.fonts?.ready;
}

/** Carrega uma fonte adicional ao selecionar no picker (lazy). */
export async function ensurePickerFontLoaded(fontId: ImageFontId): Promise<void> {
  const font = findImageFont(fontId);
  await loadGoogleFontLink(`${PICKER_FONT_LINK_ID}-${fontId}`, [font.google]);
  if (document.fonts?.load) {
    const fam = font.family.split(',')[0];
    await Promise.allSettled([
      document.fonts.load(`700 20px ${fam}`),
      document.fonts.load(`400 16px ${fam}`),
      document.fonts.load(`700 24px ${fam}`),
    ]);
  }
  await document.fonts?.ready;
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
  await loadGoogleFontLink(FONT_LINK_ID, families);

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

/** Aguarda fontes do export antes do html-to-image. */
export async function ensureCaptureFontsReady(
  text: string,
  autor: string,
  fontId?: ImageFontId
): Promise<void> {
  await ensureImageExportFonts(text, autor);
  await ensurePickerFontsLoaded(fontId);
  if (document.fonts?.load) {
    const fam = fontId ? findImageFont(fontId).family.split(',')[0] : 'Inter';
    await Promise.allSettled([
      document.fonts.load(`400 24px ${fam}`),
      document.fonts.load(`700 24px ${fam}`),
      document.fonts.load('400 14px "JetBrains Mono"'),
      document.fonts.load('500 14px "JetBrains Mono"'),
    ]);
  }
  await document.fonts?.ready;
}
