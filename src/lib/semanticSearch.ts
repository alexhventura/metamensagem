import { safeLower, safeText, safeTags } from './safeContent';
import { slugFromTag } from './tagsSeo';
import { THEME_KEYWORDS } from './tagSemantics';

const SEARCH_SYNONYMS: Record<string, string[]> = {
  amor: ['carinho', 'afeto', 'paixão', 'coração', 'amar'],
  motivacao: ['motivação', 'ânimo', 'inspirar', 'força', 'vontade'],
  motivação: ['motivacao', 'ânimo', 'inspirar'],
  reflexao: ['reflexão', 'pensar', 'meditar', 'contemplar'],
  reflexão: ['reflexao', 'pensar', 'meditar'],
  sucesso: ['vencer', 'conquistar', 'vitória', 'êxito'],
  coragem: ['ousadia', 'bravura', 'enfrentar', 'medo'],
  felicidade: ['alegria', 'feliz', 'contentamento'],
  estrategia: ['estratégia', 'planejamento', 'plano', 'visão', 'decisão', 'objetivo'],
  estratégia: ['estrategia', 'planejamento', 'visão'],
  foco: ['concentração', 'atenção', 'prioridade'],
  sabedoria: ['sábio', 'conhecimento', 'aprender'],
  fe: ['fé', 'crença', 'esperança', 'deus'],
  fé: ['fe', 'crença', 'esperança'],
  sonho: ['sonhos', 'aspiração', 'ideal'],
  superacao: ['superação', 'superar', 'vencer obstáculos'],
  persistencia: ['persistência', 'insistir', 'constância'],
  metafora: ['metáfora', 'história', 'parábola', 'narrativa'],
  metáfora: ['metafora', 'história', 'parábola'],
};

export function expandSearchTerms(query: unknown): string[] {
  const q = safeLower(query);
  if (!q) return [];
  const terms = new Set<string>([q]);
  const slug = slugFromTag(q);
  if (SEARCH_SYNONYMS[q]) SEARCH_SYNONYMS[q].forEach((t) => terms.add(t));
  if (SEARCH_SYNONYMS[slug]) SEARCH_SYNONYMS[slug].forEach((t) => terms.add(t));
  const themeKw = THEME_KEYWORDS[slug];
  if (themeKw) themeKw.slice(0, 6).forEach((t) => terms.add(t));
  return [...terms].filter((t) => t.length >= 2).slice(0, 12);
}

export interface SearchableItem {
  id?: string;
  texto?: string;
  titulo?: string;
  autor?: string;
  tags?: string[];
  resumo?: string;
}

export function matchesSemanticSearch(item: SearchableItem, query: unknown): boolean {
  const terms = expandSearchTerms(query);
  if (!terms.length) return true;
  const blob = [
    safeText(item.texto),
    safeText(item.titulo),
    safeText(item.autor),
    safeText(item.resumo),
    ...safeTags(item.tags),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return terms.some((t) => {
    const n = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return blob.includes(n);
  });
}

export function searchBancoSemantico<T extends SearchableItem & { id: string }>(
  banco: T[],
  query: unknown
): T[] {
  const q = safeText(query);
  if (!q) return banco;
  return banco.filter((item) => matchesSemanticSearch(item, q));
}

export async function searchBancoSemanticoFuzzy<T extends SearchableItem & { id: string }>(
  banco: T[],
  query: unknown,
  keys: string[] = ['texto', 'titulo', 'autor', 'tags', 'resumo']
): Promise<T[]> {
  const q = safeText(query);
  if (!q) return banco;
  const { default: Fuse } = await import('fuse.js');
  const fuse = new Fuse(banco, { keys, threshold: 0.38, ignoreLocation: true });
  const ids = new Set<string>();
  const terms = [q, ...expandSearchTerms(q)];
  for (const term of terms) {
    fuse.search(term).forEach((r) => ids.add(r.item.id));
  }
  for (const item of banco) {
    if (matchesSemanticSearch(item, q)) ids.add(item.id);
  }
  return banco.filter((i) => ids.has(i.id));
}
