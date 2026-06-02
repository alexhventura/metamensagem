import type { ImageFormat } from '../types';
import type { SeoLocale } from '../../../../lib/i18n/locales';

const LOG_KEY = 'mm-image-generation-log-v1';
const LOG_MAX = 200;

export type ImageGenerationMeta = {
  phraseId: string;
  category?: string;
  collectionId: string;
  skinId: string;
  skinName: string;
  locale?: SeoLocale;
  format: ImageFormat;
  serial: string;
  generatedAt: string;
};

export function recordImageGeneration(meta: ImageGenerationMeta): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const log: ImageGenerationMeta[] = raw ? JSON.parse(raw) : [];
    log.push(meta);
    const trimmed = log.length > LOG_MAX ? log.slice(-LOG_MAX) : log;
    localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
}

export function readImageGenerationLog(): ImageGenerationMeta[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as ImageGenerationMeta[]) : [];
  } catch {
    return [];
  }
}
