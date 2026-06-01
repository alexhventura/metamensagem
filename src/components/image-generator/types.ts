import type { CSSProperties } from 'react';
import type { SeoLocale } from '../../../lib/i18n/locales';

export type ImageFormat =
  | 'feed'
  | 'portrait'
  | 'story'
  | 'pinterest'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'wallpaper_mobile'
  | 'wallpaper_desktop';

export interface FormatConfig {
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export type SkinEngagementBadge = 'popular' | 'new' | 'exclusive';

export interface SkinConfig {
  id: string;
  name: string;
  bgClass: string;
  textClass: string;
  accentClass: string;
  borderClass?: string;
  cardStyle?: CSSProperties;
  /** Badge estático de engajamento (Fase 7A). */
  engagement?: SkinEngagementBadge;
}

export interface CollectionConfig {
  id: string;
  name: string;
  emoji: string;
  theme: string;
  skins: SkinConfig[];
}

export interface ImageGeneratorQuote {
  id: string;
  texto: string;
  autor: string;
  tags?: string[];
  categoria?: string;
  palavrasChave?: string[];
  slug?: string;
  locale?: SeoLocale;
  canonicalUrl?: string;
}
