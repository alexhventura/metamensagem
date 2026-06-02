/** Eventos estratégicos (GA4 + Clarity + fila local). */

export type AnalyticsEventName =
  | 'phrase_view'
  | 'phrase_copy'
  | 'phrase_share'
  | 'image_generate'
  | 'translation_requested'
  | 'translation_missing'
  | 'translation_success'
  | 'translation_fallback'
  | 'favorite_add';

export type AnalyticsParams = {
  phrase_id?: string;
  phrase_slug?: string;
  locale?: string;
  ui_language?: string;
  country?: string;
  category?: string;
  mode?: 'live' | 'cached' | 'contingency';
  image_format?: string;
  skin_id?: string;
  collection_id?: string;
  serial?: string;
  page_path?: string;
};

export function inferCountryCode(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const part = (navigator.language || '').split('-')[1];
  if (part && /^[a-z]{2}$/i.test(part)) return part.toUpperCase();
  return undefined;
}

export function inferUiLanguage(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator.language || '').split('-')[0]?.toLowerCase();
}

export function enrichParams(params?: AnalyticsParams): AnalyticsParams {
  return {
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    country: params?.country ?? inferCountryCode(),
    ui_language: params?.ui_language ?? inferUiLanguage(),
    ...params,
  };
}
