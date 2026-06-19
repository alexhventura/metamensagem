export type ImageFontId =
  | 'inter'
  | 'montserrat'
  | 'playfair'
  | 'poppins'
  | 'merriweather'
  | 'lora';

export interface ImageFontOption {
  id: ImageFontId;
  label: string;
  family: string;
  google: string;
}

export const IMAGE_FONT_OPTIONS: ImageFontOption[] = [
  {
    id: 'inter',
    label: 'Inter',
    family: 'Inter, ui-sans-serif, system-ui, sans-serif',
    google: 'Inter:wght@400;500;700',
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    family: '"Montserrat", ui-sans-serif, sans-serif',
    google: 'Montserrat:wght@400;500;700',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    family: '"Playfair Display", Georgia, serif',
    google: 'Playfair+Display:wght@400;700',
  },
  {
    id: 'poppins',
    label: 'Poppins',
    family: '"Poppins", ui-sans-serif, sans-serif',
    google: 'Poppins:wght@400;500;700',
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    family: '"Merriweather", Georgia, serif',
    google: 'Merriweather:wght@400;700',
  },
  {
    id: 'lora',
    label: 'Lora',
    family: '"Lora", Georgia, serif',
    google: 'Lora:wght@400;700',
  },
];

export const DEFAULT_IMAGE_FONT_ID: ImageFontId = 'inter';

export function findImageFont(id: ImageFontId): ImageFontOption {
  return IMAGE_FONT_OPTIONS.find((f) => f.id === id) ?? IMAGE_FONT_OPTIONS[0];
}

export function imageFontFamilyForChoice(
  fontId: ImageFontId,
  text: string,
  autor: string
): string {
  const base = findImageFont(fontId).family;
  const sample = `${text}\n${autor}`;
  const parts: string[] = [];
  if (/[\u0900-\u097F]/.test(sample)) parts.push('"Noto Sans Devanagari"');
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(sample)) parts.push('"Noto Sans JP"');
  parts.push(base);
  return parts.join(', ');
}
