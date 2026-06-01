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
    shortLabel: '9:19',
    width: 1080,
    height: 2340,
    aspectRatio: '9 / 19',
  },
  wallpaper_desktop: {
    label: 'Wallpaper Desktop',
    shortLabel: '16:9',
    width: 1920,
    height: 1080,
    aspectRatio: '16 / 9',
  },
};

export const FORMAT_ORDER: ImageFormat[] = [
  'feed',
  'portrait',
  'story',
  'pinterest',
  'twitter',
  'linkedin',
  'facebook',
  'wallpaper_mobile',
  'wallpaper_desktop',
];

export const DEFAULT_FORMAT: ImageFormat = 'feed';
