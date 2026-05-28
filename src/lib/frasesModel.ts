/** Tipos e helpers de frases (espelho do CMS /content). */

export interface FraseInformacoes {
  ultima_atualizacao: string | null;
  confiabilidade: string | null;
}

export interface FraseCms {
  id: string;
  slug: string;
  frase_original: string;
  autor_original: string;
  autor_slug?: string;
  categoria: string;
  contextos: string[];
  explicacao: string;
  palavras_chave: string[];
  ano_ou_data: string | null;
  fontes: string | null;
  observacao: string | null;
  autor_tipo: string | null;
  nacionalidade: string | null;
  nascimento_falecimento: string | null;
  informacoes?: FraseInformacoes;
}

let cache: FraseCms[] | null = null;
let bySlug: Map<string, FraseCms> | null = null;

export async function loadFrasesCms(): Promise<FraseCms[]> {
  if (cache) return cache;
  const res = await fetch('/frases-cms.json');
  if (!res.ok) return [];
  const data = (await res.json()) as FraseCms[];
  cache = data;
  bySlug = new Map(data.map((f) => [f.slug, f]));
  return data;
}

export function getFraseCmsBySlugSync(slug: string): FraseCms | undefined {
  return bySlug?.get(slug.toLowerCase());
}

export function primeFrasesCms(frases: FraseCms[]): void {
  cache = frases;
  bySlug = new Map(frases.map((f) => [f.slug, f]));
}

export function fraseToListItem(f: FraseCms) {
  return {
    id: f.id,
    tipo: 'frase' as const,
    texto: f.frase_original,
    autor: f.autor_original,
    tags: f.palavras_chave?.length ? f.palavras_chave : [f.categoria, ...f.contextos],
    slug: f.slug,
  };
}
