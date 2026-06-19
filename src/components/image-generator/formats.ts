import type { FormatConfig, ImageFormat } from './types';

/** Formatos ativos no editor (1:1, 4:5, 9:16). */
export const FORMAT_ORDER: ImageFormat[] = ['portrait', 'feed', 'story'];

export const FORMATS: Record<ImageFormat, FormatConfig> = {
  portrait: {
    label: 'Instagram Feed · principal',
    shortLabel: '4:5',
    width: 1080,
    height: 1350,
    aspectRatio: '4 / 5',
  },
  feed: {
    label: 'Facebook · WhatsApp',
    shortLabel: '1:1',
    width: 1080,
    height: 1080,
    aspectRatio: '1 / 1',
  },
  story: {
    label: 'Stories · Reels · TikTok',
    shortLabel: '9:16',
    width: 1080,
    height: 1920,
    aspectRatio: '9 / 16',
  },
  pinterest: {
    label: 'Pinterest',
    shortLabel: '2:3',
    width: 1000,
    height: 1500,
    aspectRatio: '2 / 3',
  },
  twitter: {
    label: 'X / Twitter',
    shortLabel: '16:9',
    width: 1600,
    height: 900,
    aspectRatio: '16 / 9',
  },
  linkedin: {
    label: 'LinkedIn',
    shortLabel: '4:5',
    width: 1080,
    height: 1350,
    aspectRatio: '4 / 5',
  },
  facebook: {
    label: 'Facebook',
    shortLabel: '1.91:1',
    width: 1200,
    height: 628,
    aspectRatio: '1.91 / 1',
  },
  wallpaper_mobile: {
    label: 'Wallpaper Mobile',
    shortLabel: '9:16+',
    width: 1440,
    height: 2560,
    aspectRatio: '9 / 16',
  },
  wallpaper_desktop: {
    label: 'Wallpaper Desktop',
    shortLabel: '16:9',
    width: 1920,
    height: 1080,
    aspectRatio: '16 / 9',
  },
};

/** @deprecated Use FORMAT_ORDER */
export const PREMIUM_FORMAT_ORDER: ImageFormat[] = FORMAT_ORDER;

/** Formato principal da plataforma (4:5). */
export const DEFAULT_FORMAT: ImageFormat = 'portrait';
