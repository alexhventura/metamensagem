/** Schema canônico de frase no CMS Metamensagem. */

export interface FraseInformacoes {
  ultima_atualizacao: string;
  confiabilidade: string | null;
  curadoria_ia?: boolean;
  origem_import?: string;
}

export interface FraseCanonical {
  id: string;
  slug: string;
  frase_original: string;
  autor_original: string;
  categoria: string;
  contextos: string[];
  explicacao: string;
  palavras_chave: string[];
  autor_tipo: string | null;
  nacionalidade: string | null;
  nascimento_falecimento: string | null;
  ano_ou_data: string | null;
  fontes?: string | null;
  observacao?: string | null;
  informacoes: FraseInformacoes;
}

export interface RawApiQuote {
  quote: string;
  author: string;
  tags?: string[];
  apiTags?: string[];
  source: string;
  sourceUrl?: string | null;
}
