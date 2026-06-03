import type { SkinConfig } from '../types';
import type { FooterFormatProfile } from './safeZone';

export type DecorativeOrb = {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  size: number;
  color: string;
  opacity: number;
  blur: number;
};

const DEFAULT_ORBS: DecorativeOrb[] = [
  { left: '6%', top: '14%', size: 280, color: '139, 92, 246', opacity: 0.09, blur: 72 },
  { right: '4%', bottom: '30%', size: 240, color: '56, 189, 248', opacity: 0.07, blur: 64 },
  { left: '40%', top: '55%', size: 140, color: '168, 85, 247', opacity: 0.05, blur: 48 },
];

function hexToRgb(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

function paletteRgb(skin: SkinConfig, key: 'accent' | 'secondary' | 'primary'): string {
  const hex = skin.palette?.[key];
  if (hex) {
    const rgb = hexToRgb(hex);
    if (rgb) return rgb;
  }
  if (key === 'accent') return '139, 92, 246';
  if (key === 'secondary') return '99, 102, 241';
  return '124, 58, 237';
}

/** Orbs decorativos Soft Premium Signature — paleta da skin, opacidade baixa. */
export function decorativeOrbsForSkin(
  skin: SkinConfig,
  _profile: FooterFormatProfile
): DecorativeOrb[] {
  const accent = paletteRgb(skin, 'accent');
  const secondary = paletteRgb(skin, 'secondary');
  const primary = paletteRgb(skin, 'primary');

  return [
    { ...DEFAULT_ORBS[0], color: accent },
    { ...DEFAULT_ORBS[1], color: secondary },
    { ...DEFAULT_ORBS[2], color: primary, opacity: 0.06 },
  ];
}

/** Opacidade da marca d'água central conforme contraste da skin. */
export function watermarkOpacityForSkin(skin: SkinConfig): number {
  const contrast = skin.palette?.contrast ?? '#FAFAFA';
  const lum =
    contrast.startsWith('#') && contrast.length >= 7
      ? (parseInt(contrast.slice(1, 3), 16) +
          parseInt(contrast.slice(3, 5), 16) +
          parseInt(contrast.slice(5, 7), 16)) /
        (3 * 255)
      : 0.5;
  return lum > 0.55 ? 0.04 : 0.055;
}
