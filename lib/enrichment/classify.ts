import { detectLanguageOriginal } from '../i18n/detectLanguage';
import {
  CATEGORIA_KEYWORDS,
  CATEGORIAS_PRINCIPAIS,
  CONTEXTO_KEYWORDS,
  CONTEXTOS,
  EMOCAO_KEYWORDS,
  EMOCOES,
} from './taxonomy';

const STOP = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'your', 'have', 'not', 'are', 'was', 'you', 'his',
  'her', 'she', 'him', 'our', 'their', 'but', 'can', 'will', 'one', 'all', 'when', 'what', 'how', 'who',
  'uma', 'uns', 'umas', 'para', 'como', 'mais', 'muito', 'sobre', 'isso', 'essa', 'esse', 'que', 'por',
]);

function scoreTaxonomy(text: string, map: Record<string, string[]>): { slug: string; score: number }[] {
  const lower = text.toLowerCase();
  const scores: { slug: string; score: number }[] = [];
  for (const [slug, keys] of Object.entries(map)) {
    let s = 0;
    for (const k of keys) {
      if (lower.includes(k)) s += k.length > 4 ? 2 : 1;
    }
    if (s > 0) scores.push({ slug, score: s });
  }
  return scores.sort((a, b) => b.score - a.score);
}

export function classifyCategoriaPrincipal(
  frase: string,
  tags: string[],
  atual?: string
): string {
  const blob = `${frase} ${tags.join(' ')}`;
  const ranked = scoreTaxonomy(blob, CATEGORIA_KEYWORDS);
  if (ranked.length) return ranked[0].slug;
  const tagSlug = (atual || tags[0] || 'reflexao').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if ((CATEGORIAS_PRINCIPAIS as readonly string[]).includes(tagSlug)) return tagSlug;
  return 'reflexao';
}

export function classifyList(
  frase: string,
  tags: string[],
  map: Record<string, string[]>,
  allowed: readonly string[],
  max = 4
): string[] {
  const ranked = scoreTaxonomy(`${frase} ${tags.join(' ')}`, map);
  const out = ranked.map((r) => r.slug).filter((s) => allowed.includes(s));
  return [...new Set(out)].slice(0, max);
}

export function classifyContextos(frase: string, tags: string[]): string[] {
  return classifyList(frase, tags, CONTEXTO_KEYWORDS, CONTEXTOS, 3);
}

export function classifyEmocoes(frase: string, tags: string[]): string[] {
  return classifyList(frase, tags, EMOCAO_KEYWORDS, EMOCOES, 3);
}

export function extractTemas(frase: string, categoria: string, tags: string[]): string[] {
  const words = frase
    .toLowerCase()
    .replace(/[^a-zà-ú0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOP.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
  return [...new Set([categoria, ...tags.slice(0, 3), ...top])].slice(0, 8);
}

export function detectIdioma(frase: string): string {
  return detectLanguageOriginal(frase);
}
