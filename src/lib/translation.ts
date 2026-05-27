import { safeText } from './safeContent';

/** Tradução por card com cache local (UX only — não altera SEO/indexação). */

export type CardLang = 'pt' | 'en' | 'es';

export const CARD_LANG_OPTIONS: { code: CardLang; label: string; flag: string }[] = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const CACHE_KEY = 'mm-trans-cache-v1';
const CACHE_MAX = 400;
const API = 'https://api.mymemory.translated.net/get';

type CacheStore = Record<string, string>;

function toApiLang(code: CardLang): string {
  return code === 'pt' ? 'pt-BR' : code;
}

function langPair(from: CardLang, to: CardLang): string {
  return `${toApiLang(from)}|${toApiLang(to)}`;
}

function readCache(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheStore) : {};
  } catch {
    return {};
  }
}

function writeCache(store: CacheStore) {
  const keys = Object.keys(store);
  const trimmed =
    keys.length > CACHE_MAX
      ? Object.fromEntries(keys.slice(-CACHE_MAX).map((k) => [k, store[k]]))
      : store;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
}

function cacheId(text: string, from: CardLang, to: CardLang): string {
  return `${from}>${to}:${text.length}:${text.slice(0, 64)}`;
}

/** Detecção leve do idioma de origem (evita tradução desnecessária). */
export function detectCardLanguage(text: unknown): CardLang {
  const t = safeText(text).toLowerCase().normalize('NFD');
  if (!t) return 'pt';
  const ptMarks = (t.match(/[\u0300-\u036f]/g) || []).length;
  const ptWords = /\b(não|que|uma|para|com|você|vida|amor|ser|mais)\b/.test(t) ? 2 : 0;
  const esWords = /\b(el|la|los|las|que|por|para|con|vida|amor|más)\b/.test(t) ? 2 : 0;
  const enWords = /\b(the|and|is|are|was|were|you|your|life|love|with|for)\b/.test(t) ? 2 : 0;

  const ptScore = ptMarks + ptWords;
  const esScore = (t.includes('ñ') ? 2 : 0) + esWords;
  const enScore = enWords;

  if (ptScore >= esScore && ptScore >= enScore && ptScore >= 1) return 'pt';
  if (esScore > enScore && esScore >= 2) return 'es';
  if (enScore >= 2) return 'en';
  return 'pt';
}

export async function translateCardText(
  text: string,
  target: CardLang,
  sourceLang?: CardLang
): Promise<string> {
  const trimmed = text?.trim();
  if (!trimmed) return text;

  const from = sourceLang ?? detectCardLanguage(trimmed);
  if (from === target) return trimmed;

  const id = cacheId(trimmed, from, target);
  const cache = readCache();
  if (cache[id]) return cache[id];

  const pair = langPair(from, target);
  const url = `${API}?q=${encodeURIComponent(trimmed)}&langpair=${pair}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tradução indisponível (${res.status})`);

  const data = await res.json();
  const translated =
    data?.responseData?.translatedText?.trim() ||
    data?.matches?.[0]?.translation?.trim();

  if (!translated) throw new Error('Tradução vazia');

  cache[id] = translated;
  writeCache(cache);

  return translated;
}

export interface CardContentSource {
  texto: string;
  titulo?: string;
  resumo?: string;
}

export interface CardContentDisplay extends CardContentSource {
  isTranslated: boolean;
}

export async function translateCardContent(
  source: CardContentSource,
  target: CardLang
): Promise<CardContentDisplay> {
  const detected = detectCardLanguage(source.texto);

  if (detected === target) {
    return { ...source, isTranslated: false };
  }

  const [texto, titulo, resumo] = await Promise.all([
    translateCardText(source.texto, target, detected),
    source.titulo
      ? translateCardText(source.titulo, target, detectCardLanguage(source.titulo))
      : Promise.resolve(undefined),
    source.resumo
      ? translateCardText(source.resumo, target, detectCardLanguage(source.resumo))
      : Promise.resolve(undefined),
  ]);

  return {
    texto,
    titulo,
    resumo,
    isTranslated: true,
  };
}
