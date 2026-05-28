import { slugify, slugifyAutor } from './slugify';

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
}

function normSlug(value: string): string {
  return slugify(value.trim().toLowerCase());
}

function uniqueStrings(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
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
