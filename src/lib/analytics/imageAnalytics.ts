import { trackEvent } from './track';

export function trackImageGenerate(params: {
  phrase_id: string;
  phrase_slug?: string;
  category?: string;
  locale?: string;
  format?: string;
  skin_id?: string;
  collection_id?: string;
  serial?: string;
}): void {
  trackEvent('image_generate', {
    phrase_id: params.phrase_id,
    phrase_slug: params.phrase_slug,
    category: params.category,
    locale: params.locale,
    image_format: params.format,
    skin_id: params.skin_id,
    collection_id: params.collection_id,
    serial: params.serial,
  });
}
