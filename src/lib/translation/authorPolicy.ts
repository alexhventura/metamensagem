/**
 * Autores reais (ex.: Albert Einstein) nunca são traduzidos.
 * Apenas rótulos genéricos/colecionáveis podem ser localizados.
 */

function normalizeAuthorKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Chaves exatas após normalização. */
const GENERIC_AUTHOR_KEYS = new Set([
  'anonimo',
  'anónimo',
  'anonymous',
  'desconhecido',
  'desconhecida',
  'unknown',
  'autor desconhecido',
  'autora desconhecida',
  'unknown author',
  'autor anonimo',
  'autora anonima',
  'proverbio chines',
  'proverbio chinese',
  'chinese proverb',
  'sabedoria popular',
  'sabedorias populares',
  'folk wisdom',
  'popular wisdom',
  'sabiduria popular',
  'sagesse populaire',
  'volksweisheit',
  'saggezza popolare',
  'oral tradition',
  'tradicao oral',
  'tradicional',
  'traditional',
  'popular saying',
  'dito popular',
  'refrao popular',
  'refran popular',
]);

const GENERIC_AUTHOR_PATTERNS: RegExp[] = [
  /^autor(a)? desconhecid[oa]$/,
  /^unknown author$/,
  /^proverbio\s+chin[eê]s$/,
  /^chinese\s+proverb$/,
  /^sabedoria(s)?\s+popular(es)?$/,
  /^folk\s+wisdom$/,
  /^popular\s+wisdom$/,
];

export function shouldTranslateAuthor(author: string | undefined | null): boolean {
  if (!author?.trim()) return false;
  const key = normalizeAuthorKey(author);
  if (GENERIC_AUTHOR_KEYS.has(key)) return true;
  return GENERIC_AUTHOR_PATTERNS.some((re) => re.test(key));
}

/** Mantém autor original salvo exceções genéricas. */
export function resolveTranslatedAuthor(
  original: string | undefined,
  translated: string | undefined
): string | undefined {
  if (!original?.trim()) return original;
  if (!shouldTranslateAuthor(original)) return original;
  return translated ?? original;
}
