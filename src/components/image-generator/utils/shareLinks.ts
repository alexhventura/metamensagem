import { fraseCanonicalUrl } from '../../../lib/i18nRoutes';
import { SITE_ORIGIN } from '../../../lib/seo';
import type { SeoLocale } from '../../../lib/i18n/locales';
import type { ImageGeneratorQuote } from '../types';

export function resolveQuoteCanonicalUrl(
  quote: ImageGeneratorQuote,
  locale: SeoLocale = 'pt'
): string {
  if (quote.canonicalUrl) return quote.canonicalUrl;
  if (quote.slug) {
    const def = quote.locale ?? locale;
    return fraseCanonicalUrl(quote.slug, def, def);
  }
  return typeof window !== 'undefined' ? window.location.href : SITE_ORIGIN;
}

export interface SocialShareLinks {
  whatsapp: string;
  pinterest: string;
  twitter: string;
  facebook: string;
}

export function buildSocialShareLinks(
  quote: ImageGeneratorQuote,
  locale: SeoLocale = 'pt'
): SocialShareLinks {
  const url = resolveQuoteCanonicalUrl(quote, locale);
  const snippet = `${quote.texto.slice(0, 180)} — ${quote.autor}`;
  const waText = `${snippet}\n\n${url}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(snippet);
  const encodedWa = encodeURIComponent(waText);
  const encodedDesc = encodeURIComponent(quote.texto.slice(0, 500));

  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encodedWa}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedDesc}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
}

export function canShareImageFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  if (typeof navigator.canShare !== 'function') return true;
  try {
    const probe = new File([''], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}
