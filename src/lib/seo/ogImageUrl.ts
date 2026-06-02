import { SITE_ORIGIN } from '../../../lib/seo/url';

/** URL pública da imagem OG premium gerada no servidor. */
export function ogImageUrlForPhrase(phraseId: string): string {
  const id = encodeURIComponent(phraseId.trim());
  return `${SITE_ORIGIN}/imagem/${id}`;
}
