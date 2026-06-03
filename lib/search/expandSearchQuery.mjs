/**
 * Expande query do usuário em termos semânticos cross-language (custo zero).
 * Ex.: "superação" → resiliência, persistência, coragem, overcoming, resilience…
 */

import crossLangThemes from './crossLangThemes.json' with { type: 'json' };
import { normalizeToken, slugify, SEO_LOCALES } from './buildSearchIndexRow.mjs';

const MAX_TERMS = 36;

/** @type {Record<string, string[]>} */
const THEME_CLUSTERS = crossLangThemes._clusters ?? {};

/** @type {Record<string, Record<string, string[]>>} */
const THEMES = Object.fromEntries(
  Object.entries(crossLangThemes).filter(([k]) => k !== '_clusters')
);

function keywordMatchesQuery(normalizedQuery, keyword) {
  const kw = normalizeToken(keyword);
  if (!kw || kw.length < 2) return false;
  if (kw === normalizedQuery) return true;
  if (normalizedQuery.length >= 3 && kw.includes(normalizedQuery)) return true;
  if (kw.length >= 3 && normalizedQuery.includes(kw)) return true;
  return false;
}

function themesForQuery(normalizedQuery) {
  const matched = new Set();

  for (const [themeSlug, pack] of Object.entries(THEMES)) {
    if (themeSlug === normalizedQuery || slugify(normalizedQuery) === themeSlug) {
      matched.add(themeSlug);
      continue;
    }
    for (const locale of SEO_LOCALES) {
      const list = pack[locale];
      if (!list) continue;
      for (const kw of list) {
        if (keywordMatchesQuery(normalizedQuery, kw)) {
          matched.add(themeSlug);
          break;
        }
      }
      if (matched.has(themeSlug)) break;
    }
  }

  const expanded = new Set(matched);
  for (const theme of matched) {
    for (const related of THEME_CLUSTERS[theme] || []) {
      if (THEMES[related]) expanded.add(related);
    }
  }

  return expanded;
}

function termsForThemes(themeSlugs) {
  const terms = new Set();
  for (const theme of themeSlugs) {
    const pack = THEMES[theme];
    if (!pack) continue;
    for (const locale of SEO_LOCALES) {
      for (const kw of pack[locale] || []) {
        const n = normalizeToken(kw);
        if (n && n.length >= 2) terms.add(n);
      }
    }
  }
  return terms;
}

/**
 * @param {string} query
 * @param {string} [_locale]
 * @returns {{ raw: string; terms: string[]; themes: string[] }}
 */
export function expandSearchQuery(query, _locale = 'pt') {
  const raw = normalizeToken(String(query || '').trim());
  if (!raw) return { raw: '', terms: [], themes: [] };

  const themes = [...themesForQuery(raw)];
  const terms = new Set([raw]);

  for (const t of termsForThemes(new Set(themes))) terms.add(t);

  for (const token of raw.split(/\s+/)) {
    if (token.length < 2) continue;
    terms.add(token);
    for (const theme of themesForQuery(token)) {
      for (const t of termsForThemes(new Set([theme]))) terms.add(t);
    }
  }

  return {
    raw,
    terms: [...terms].slice(0, MAX_TERMS),
    themes,
  };
}

export { THEME_CLUSTERS };
