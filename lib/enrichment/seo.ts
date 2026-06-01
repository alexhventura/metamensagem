import type { FraseSeoPack } from './types';

export function buildSeoPack(input: {
  frase: string;
  slug: string;
  autor: string;
  autorSlug: string;
  categoriaPrincipal: string;
  categorias: string[];
  contextos: string[];
  emocoes: string[];
  palavrasChave: string[];
  explicacao: string;
}): FraseSeoPack {
  const tituloCurto =
    input.frase.length > 55 ? `${input.frase.slice(0, 52)}…` : input.frase;
  const titleSeo = `"${tituloCurto}" — ${input.autor} | Metamensagem`;
  const descriptionSeo = (input.explicacao || input.frase).slice(0, 158).trim() + '…';
  const keywordsSeo = [
    `frases de ${input.autor}`,
    `frases sobre ${input.categoriaPrincipal.replace(/-/g, ' ')}`,
    ...input.categorias.slice(0, 2).map((c) => `frases ${c.replace(/-/g, ' ')}`),
    ...input.contextos.slice(0, 2).map((c) => `frases ${c.replace(/-/g, ' ')}`),
    ...input.palavrasChave.slice(0, 4),
  ].filter(Boolean);
  const relatedKeywords = [
    ...input.emocoes,
    ...input.categorias,
    input.autorSlug,
    input.categoriaPrincipal,
  ].slice(0, 12);

  return {
    titleSeo,
    descriptionSeo,
    keywordsSeo: [...new Set(keywordsSeo)].slice(0, 10),
    canonicalSlug: input.slug,
    relatedKeywords: [...new Set(relatedKeywords)],
    searchIntent: 'informacional',
  };
}
