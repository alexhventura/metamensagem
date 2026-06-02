import { fraseSlugForUrl } from '../../../lib/slug';
import type { ItemConteudo } from '../../../types/content';
import type { ImageGeneratorQuote } from '../types';

export type QuoteFromItemOverrides = {
  texto?: string;
  autor?: string;
};

/** Monta payload do gerador a partir de um item do feed (tags + slug para SEO/share). */
export function quoteFromItem(
  item: ItemConteudo,
  overrides?: QuoteFromItemOverrides
): ImageGeneratorQuote {
  const slug = fraseSlugForUrl(item.slug, item.texto, item.id);

  return {
    id: item.id,
    texto: overrides?.texto ?? item.texto,
    autor: overrides?.autor ?? item.autor,
    tags: item.tags,
    slug,
  };
}
