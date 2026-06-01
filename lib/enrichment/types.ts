/** Schema semântico enriquecido (fase 2) — compatível com FraseCms legado. */

export interface FraseSeoPack {
  titleSeo: string;
  descriptionSeo: string;
  keywordsSeo: string[];
  canonicalSlug: string;
  relatedKeywords: string[];
  searchIntent: string;
}

export interface FraseSemantica {
  categoriaPrincipal: string;
  categorias: string[];
  contextos: string[];
  emocoes: string[];
  temas: string[];
  palavrasChave: string[];
  tagsSeo: string[];
  idiomaOriginal: string;
  /** Alias Fase 6 (ISO-like) — espelha idiomaOriginal */
  languageOriginal?: string;
  availableLanguages?: string[];
  ano: string | null;
  periodoHistorico: string | null;
  nacionalidadeAutor: string | null;
  nascimentoAutor: string | null;
  falecimentoAutor: string | null;
  tipoAutor: string | null;
  popularidade: number;
  fonte: string | null;
  ultimaAtualizacao: string;
  frasesRelacionadas: string[];
  biografiaAutorCurta: string | null;
}

export interface FraseEnriquecida {
  id: string;
  slug: string;
  texto: string;
  autor: string;
  autorSlug: string;
  explicacao: string;
  semantica: FraseSemantica;
  seo: FraseSeoPack;
  /** Campos legados (espelho) */
  frase_original: string;
  autor_original: string;
  autor_slug: string;
  categoria: string;
  contextos: string[];
  palavras_chave: string[];
  ano_ou_data: string | null;
  autor_tipo: string | null;
  nacionalidade: string | null;
  nascimento_falecimento: string | null;
  fontes: string | null;
  informacoes?: {
    ultima_atualizacao: string;
    confiabilidade: string | null;
    curadoria_ia?: boolean;
    enriquecimento_fase2?: boolean;
  };
}

export interface FraseIndexLite {
  id: string;
  slug: string;
  autorSlug: string;
  categoriaPrincipal: string;
  shard: string;
}
