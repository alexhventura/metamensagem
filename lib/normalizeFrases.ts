import { slugify, slugifyAutor } from './slugify';

export interface FraseInformacoes {
  ultima_atualizacao: string | null;
  confiabilidade: string | null;
}

export interface FraseRaw {
  id?: string;
  slug?: string;
  frase_original?: string;
  texto?: string;
  autor_original?: string;
  autor?: string;
  categoria?: string;
  contextos?: string[];
  tags?: string[];
  explicacao?: string;
  palavras_chave?: string[];
  ano_ou_data?: string | null;
  /** Legado — migrado para ano_ou_data */
  'a frase foi dita em'?: string | null;
  a_frase_foi_dita_em?: string | null;
  fontes?: string | null;
  observacao?: string | null;
  autor_tipo?: string | null;
  nacionalidade?: string | null;
  nascimento_falecimento?: string | null;
  informacoes?: Partial<FraseInformacoes> | null;
}

export interface Frase {
  id: string;
  slug: string;
  frase_original: string;
  autor_original: string;
  autor_slug: string;
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
  informacoes: FraseInformacoes;
}

function normSlug(value: string): string {
  return slugify(value.trim().toLowerCase());
}

function uniqueStrings(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

function normOptionalString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

/** Extrai ano ou data; migra campo legado. */
export function extractAnoOuData(raw: FraseRaw): string | null {
  const candidates = [
    raw.ano_ou_data,
    raw['a frase foi dita em'],
    raw.a_frase_foi_dita_em,
  ];
  for (const c of candidates) {
    const v = normOptionalString(c);
    if (v) return v;
  }
  return null;
}

function normalizeInformacoes(raw?: Partial<FraseInformacoes> | null): FraseInformacoes {
  return {
    ultima_atualizacao: normOptionalString(raw?.ultima_atualizacao),
    confiabilidade: normOptionalString(raw?.confiabilidade),
  };
}

export function normalizeFrase(raw: FraseRaw, usedSlugs: Set<string>): Frase | null {
  const frase_original = (raw.frase_original || raw.texto || '').trim();
  if (!frase_original) return null;

  const autor_original = (raw.autor_original || raw.autor || 'Anônimo').split('\n')[0].trim();
  const autor_slug = slugifyAutor(autor_original);

  const tags = uniqueStrings(
    (raw.palavras_chave || raw.tags || []).map((t) => normSlug(String(t)))
  );

  const categoria = normSlug(raw.categoria || tags[0] || 'inspiracional');

  const contextos = uniqueStrings(
    (raw.contextos || tags.slice(1)).map((c) => normSlug(String(c)))
  );
  const ctxFinal = contextos.length ? contextos : ['reflexao'];

  let slug = raw.slug ? normSlug(raw.slug) : slugify(frase_original.slice(0, 80));
  if (!slug) slug = raw.id ? normSlug(raw.id) : slugify(frase_original.slice(0, 40));

  let candidate = slug;
  let n = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${slug}-${n++}`;
  }
  usedSlugs.add(candidate);
  slug = candidate;

  const id = (raw.id || `f_${slug}`).trim();

  return {
    id,
    slug,
    frase_original,
    autor_original,
    autor_slug,
    categoria,
    contextos: ctxFinal,
    explicacao: (raw.explicacao || '').trim(),
    palavras_chave: tags.length ? tags : [categoria, ...ctxFinal].slice(0, 8),
    ano_ou_data: extractAnoOuData(raw),
    fontes: normOptionalString(raw.fontes),
    observacao: normOptionalString(raw.observacao),
    autor_tipo: normOptionalString(raw.autor_tipo),
    nacionalidade: normOptionalString(raw.nacionalidade),
    nascimento_falecimento: normOptionalString(raw.nascimento_falecimento),
    informacoes: normalizeInformacoes(raw.informacoes),
  };
}

export function normalizeFrases(rawList: FraseRaw[]): Frase[] {
  const usedSlugs = new Set<string>();
  const out: Frase[] = [];

  for (const raw of rawList) {
    const normalized = normalizeFrase(raw, usedSlugs);
    if (normalized) out.push(normalized);
  }

  return out;
}
