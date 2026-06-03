/**
 * Constrói search_text + keywords para frase_search_index (custo zero).
 * Usado pelo backfill (Node) e pelos hooks de tradução/import (api).
 */

import crossLangThemes from './crossLangThemes.json' with { type: 'json' };

export const SEO_LOCALES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'];

const STOPWORDS = {
  pt: new Set([
    'a', 'o', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma',
    'uns', 'umas', 'que', 'se', 'por', 'para', 'com', 'sem', 'ao', 'aos', 'à', 'às', 'eu', 'tu',
    'ele', 'ela', 'nós', 'vos', 'eles', 'elas', 'me', 'te', 'lhe', 'nos', 'vos', 'lhes', 'meu',
    'minha', 'seu', 'sua', 'nosso', 'vosso', 'isso', 'isto', 'aquilo', 'mais', 'muito', 'muita',
    'como', 'quando', 'onde', 'porque', 'pois', 'mas', 'ou', 'nem', 'já', 'ainda', 'só', 'ser',
    'estar', 'ter', 'há', 'foi', 'são', 'era', 'the',
  ]),
  en: new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
    'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your',
    'his', 'her', 'its', 'our', 'their', 'not', 'no', 'yes', 'so', 'if', 'then', 'than', 'when',
    'where', 'what', 'which', 'who', 'whom', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'only', 'own', 'same', 'too', 'very', 'just', 'also',
  ]),
  es: new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'de', 'del', 'al', 'en',
    'con', 'sin', 'por', 'para', 'que', 'como', 'más', 'muy', 'ser', 'estar', 'es', 'son', 'fue',
    'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'su', 'sus', 'mi', 'mis',
  ]),
  fr: new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux', 'et', 'ou', 'en', 'dans',
    'sur', 'pour', 'par', 'avec', 'sans', 'que', 'qui', 'je', 'tu', 'il', 'elle', 'nous', 'vous',
    'ils', 'elles', 'est', 'sont', 'été', 'être', 'avoir', 'ce', 'cette', 'ces', 'mon', 'ma',
  ]),
  de: new Set([
    'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines', 'einem', 'einen',
    'und', 'oder', 'in', 'im', 'zu', 'zum', 'zur', 'mit', 'von', 'vom', 'für', 'auf', 'an', 'ist',
    'sind', 'war', 'waren', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'nicht', 'auch', 'nur',
  ]),
  it: new Set([
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'del', 'della', 'dei', 'degli',
    'delle', 'in', 'con', 'su', 'per', 'da', 'e', 'o', 'che', 'non', 'è', 'sono', 'io', 'tu',
    'lui', 'lei', 'noi', 'voi', 'loro', 'mio', 'mia', 'tuo', 'tua',
  ]),
  ja: new Set(['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や', 'れる', 'など']),
  hi: new Set(['का', 'की', 'के', 'है', 'हैं', 'था', 'थी', 'थे', 'और', 'या', 'से', 'में', 'को', 'पर', 'ने', 'एक', 'यह', 'वह', 'कि', 'जो', 'तो', 'भी', 'ही']),
};

const SEARCH_TEXT_MAX = 480;
const KEYWORDS_MAX = 36;

export function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(value) {
  return normalizeToken(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function stopwordsFor(language) {
  return STOPWORDS[language] || STOPWORDS.en;
}

export function tokenize(text, language = 'pt') {
  const normalized = normalizeToken(text);
  if (!normalized) return [];
  const stops = stopwordsFor(language);
  const tokens = [];
  const seen = new Set();
  for (const raw of normalized.split(/\s+/)) {
    const token = raw.replace(/^-+|-+$/g, '');
    if (token.length < 2 || stops.has(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

function collectThemeSlugs({ categoria, tags = [], palavrasChave = [] }) {
  const slugs = new Set();
  const push = (v) => {
    const s = slugify(v);
    if (s) slugs.add(s);
  };
  if (categoria) push(categoria);
  for (const t of tags) push(t);
  for (const p of palavrasChave) push(p);

  const clusters = crossLangThemes._clusters ?? {};
  const expanded = new Set(slugs);
  for (const s of slugs) {
    for (const related of clusters[s] || []) expanded.add(related);
  }
  return expanded;
}

function themeKeywordsForLanguage(themeSlugs, language) {
  const out = [];
  const seen = new Set();
  for (const theme of themeSlugs) {
    const pack = crossLangThemes[theme];
    if (!pack) continue;
    for (const locale of SEO_LOCALES) {
      const list = pack[locale];
      if (!list) continue;
      for (const kw of list) {
        const n = normalizeToken(kw);
        if (!n || n.length < 2 || seen.has(n)) continue;
        seen.add(n);
        out.push(n);
      }
    }
    if (language && pack[language]) {
      for (const kw of pack[language]) {
        const n = normalizeToken(kw);
        if (n && !seen.has(n)) {
          seen.add(n);
          out.unshift(n);
        }
      }
    }
  }
  return out;
}

/**
 * @param {{
 *   language: string;
 *   text: string;
 *   titulo?: string;
 *   autor?: string;
 *   categoria?: string;
 *   tags?: string[];
 *   palavrasChave?: string[];
 * }} input
 */
export function buildSearchIndexRow(input) {
  const language = SEO_LOCALES.includes(input.language) ? input.language : 'pt';
  const text = String(input.text || input.titulo || '').trim();
  const autor = String(input.autor || '').trim();
  const categoria = String(input.categoria || '').trim();
  const tags = Array.isArray(input.tags) ? input.tags : [];
  const palavrasChave = Array.isArray(input.palavrasChave) ? input.palavrasChave : [];

  const searchParts = [text, autor, categoria.replace(/-/g, ' '), ...tags.map((t) => t.replace(/-/g, ' '))];
  const search_text = searchParts
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_TEXT_MAX);

  const themeSlugs = collectThemeSlugs({ categoria, tags, palavrasChave });
  const keywords = [];
  const seen = new Set();

  const addKw = (kw) => {
    const n = normalizeToken(kw);
    if (!n || n.length < 2 || seen.has(n)) return;
    seen.add(n);
    keywords.push(n);
  };

  for (const t of tokenize(text, language).slice(0, 14)) addKw(t);
  for (const t of tags) addKw(t.replace(/-/g, ' '));
  if (categoria) addKw(categoria.replace(/-/g, ' '));
  for (const p of palavrasChave) addKw(p);
  for (const t of themeKeywordsForLanguage(themeSlugs, language)) addKw(t);

  return {
    search_text,
    keywords: keywords.slice(0, KEYWORDS_MAX),
  };
}

/**
 * Gera linhas por idioma a partir do texto original + traduções disponíveis.
 * @param {{
 *   fraseId: string;
 *   languageOriginal: string;
 *   originalText: string;
 *   autor?: string;
 *   categoria?: string;
 *   tags?: string[];
 *   palavrasChave?: string[];
 *   translations?: Array<{ locale: string; texto: string }>;
 * }} input
 */
export function buildSearchIndexRowsForPhrase(input) {
  const rows = [];
  const base = {
    autor: input.autor,
    categoria: input.categoria,
    tags: input.tags,
    palavrasChave: input.palavrasChave,
  };

  const origLang = SEO_LOCALES.includes(input.languageOriginal) ? input.languageOriginal : 'pt';
  const origRow = buildSearchIndexRow({
    language: origLang,
    text: input.originalText,
    ...base,
  });
  rows.push({
    frase_id: input.fraseId,
    language: origLang,
    ...origRow,
  });

  const seenLocales = new Set([origLang]);
  for (const tr of input.translations || []) {
    const locale = String(tr.locale || '').toLowerCase();
    const texto = String(tr.texto || '').trim();
    if (!SEO_LOCALES.includes(locale) || !texto || seenLocales.has(locale)) continue;
    seenLocales.add(locale);
    const row = buildSearchIndexRow({
      language: locale,
      text: texto,
      ...base,
    });
    rows.push({ frase_id: input.fraseId, language: locale, ...row });
  }

  return rows;
}
