import type { FormatConfig, ImageFormat } from './types';

export const FORMATS: Record<ImageFormat, FormatConfig> = {
  feed: {
    label: 'Instagram Feed',
    shortLabel: '1:1',
    width: 1080,
    height: 1080,
    aspectRatio: '1 / 1',
  },
  portrait: {
    label: 'Instagram Retrato',
    shortLabel: '4:5',
    width: 1080,
    height: 1350,
    aspectRatio: '4 / 5',
  },
  story: {
    label: 'Stories / Reels',
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

/** Formatos premium destacados (mesma safe zone). */
export const PREMIUM_FORMAT_ORDER: ImageFormat[] = [
  'feed',
  'story',
  'portrait',
  'wallpaper_desktop',
  'wallpaper_mobile',
];

export const FORMAT_ORDER: ImageFormat[] = [
  ...PREMIUM_FORMAT_ORDER,
  'pinterest',
  'twitter',
  'linkedin',
  'facebook',
];

export const DEFAULT_FORMAT: ImageFormat = 'feed';
