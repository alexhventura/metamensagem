import { safeText } from './safeContent';

/** Tradução por card com cache local (UX only — não altera SEO/indexação). */

export type CardLang = 'pt' | 'en' | 'es';

export const CARD_LANG_OPTIONS: { code: CardLang; label: string; flag: string }[] = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const CACHE_KEY_V2 = 'mm-trans-cache-v2';
const CACHE_MAX = 500;
const API = 'https://api.mymemory.translated.net/get';
const MAX_CHUNK = 420;

type TransCacheEntry = {
  text: string;
  from: CardLang;
  to: CardLang;
  at: number;
};

type TransCacheStore = Record<string, TransCacheEntry>;

const EN_STOP =
  /\b(the|and|is|are|was|were|you|your|life|love|with|for|that|this|have|from|not|but|what|all|when|we|will|can|our|out|day|get|has|how|its|may|new|now|old|see|two|way|who|let|say|she|too|use|her|been|come|does|each|even|into|just|like|long|make|many|most|much|must|only|over|such|take|than|them|then|they|very|well|also|back|being|call|first|give|good|great|hand|high|home|keep|know|last|left|live|look|made|mind|more|name|need|never|next|once|part|people|place|right|same|some|still|think|those|though|through|time|turn|under|until|want|while|world|year|after|again|before|between|both|could|during|every|found|going|might|other|shall|since|something|these|thing|three|upon|where|which|without|would|die|sorry|undertaker)\b/i;

const PT_STOP =
  /\b(não|nao|que|uma|para|com|você|voce|vida|amor|ser|mais|como|mas|por|seu|sua|isso|essa|este|esta|aos|das|nos|nas|pelo|pela|ainda|muito|todo|toda|todos|todas|onde|quando|porque|porquê|será|sera|está|esta|estao|estão|são|sao|tem|ter|foi|ser|nos|vos|lhe|lhes)\b/i;

const ES_STOP =
  /\b(el|la|los|las|que|por|para|con|vida|amor|más|mas|una|uno|del|al|son|está|esta|están|como|pero|todo|toda|todos|todas|muy|sin|sobre|entre|cuando|donde|porque|ser|hay|han|fue|era|sus|ese|esa|esto|estos)\b/i;

export class TranslationFailedError extends Error {
  constructor(
    message: string,
    public readonly target: CardLang
  ) {
    super(message);
    this.name = 'TranslationFailedError';
  }
}

function toApiLang(code: CardLang): string {
  return code === 'pt' ? 'pt-BR' : code;
}

function langPair(from: CardLang, to: CardLang): string {
  return `${toApiLang(from)}|${toApiLang(to)}`;
}

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function cacheKey(contentId: string | undefined, from: CardLang, to: CardLang, text: string): string {
  const id = safeText(contentId) || `txt_${hashText(text)}`;
  return `${id}::${from}::${to}`;
}

function readCache(): TransCacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY_V2);
    return raw ? (JSON.parse(raw) as TransCacheStore) : {};
  } catch {
    return {};
  }
}

function writeCache(store: TransCacheStore) {
  const keys = Object.keys(store);
  const trimmed =
    keys.length > CACHE_MAX
      ? Object.fromEntries(keys.slice(-CACHE_MAX).map((k) => [k, store[k]]))
      : store;
  try {
    localStorage.setItem(CACHE_KEY_V2, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
}

function removeCacheEntry(key: string) {
  const store = readCache();
  if (store[key]) {
    delete store[key];
    writeCache(store);
  }
}

/** Normaliza texto antes de enviar à API (aspas, unicode, espaços). */
export function sanitizeTextForTranslation(text: unknown): string {
  return safeText(text)
    .normalize('NFC')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForCompare(s: string): string {
  return sanitizeTextForTranslation(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function isSameish(a: string, b: string): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return true;
  if (na === nb) return true;
  const longer = na.length >= nb.length ? na : nb;
  const shorter = na.length >= nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length / longer.length > 0.9) return true;
  return false;
}

function hasPortugueseDiacritics(t: string): boolean {
  return /[áàâãéêíóôõúç]/i.test(t);
}

function hasSpanishMarkers(t: string): boolean {
  return /[ñ¿¡]/i.test(t) || ES_STOP.test(t);
}

function looksEnglishTitleCase(text: string): boolean {
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
  if (words.length < 4) return false;
  const capped = words.filter((w) => /^[A-Z][a-z']+$/.test(w)).length;
  return capped / words.length >= 0.55 && !hasPortugueseDiacritics(text);
}

function scoreLanguage(t: string): Record<CardLang, number> {
  const lower = t.toLowerCase();
  const ptMarks = (t.match(/[\u0300-\u036f]/g) || []).length;
  const pt = ptMarks * 2 + (PT_STOP.test(lower) ? 3 : 0) + (hasPortugueseDiacritics(t) ? 4 : 0);
  const es = (t.includes('ñ') ? 3 : 0) + (ES_STOP.test(lower) ? 3 : 0);
  let en = EN_STOP.test(lower) ? 3 : 0;
  if (looksEnglishTitleCase(t)) en += 4;
  if (!hasPortugueseDiacritics(t) && !hasSpanishMarkers(t) && /^[\x20-\x7E\u00C0-\u024F'".,!?;:()\-–—]+$/.test(t)) {
    en += 1;
  }
  return { pt, en, es };
}

/** Detecção de idioma do conteúdo (export alias pedido na spec). */
export function detectLanguage(text: unknown): CardLang {
  return detectCardLanguage(text);
}

/** Detecção do idioma de origem do card. */
export function detectCardLanguage(text: unknown): CardLang {
  const t = sanitizeTextForTranslation(text).toLowerCase().normalize('NFD');
  if (!t) return 'pt';

  const scores = scoreLanguage(t);
  const { pt, en, es } = scores;
  const max = Math.max(pt, en, es);

  if (max === 0) {
    if (looksEnglishTitleCase(sanitizeTextForTranslation(text))) return 'en';
    if (!hasPortugueseDiacritics(t) && t.length > 12) return 'en';
    return 'pt';
  }

  if (pt === max && pt >= 2) return 'pt';
  if (es === max && es >= en) return 'es';
  if (en === max) return 'en';
  if (es > pt) return 'es';
  return 'en';
}

export function textAppearsToBeLanguage(text: unknown, lang: CardLang): boolean {
  const t = sanitizeTextForTranslation(text);
  if (!t) return true;
  return detectCardLanguage(t) === lang;
}

function isValidTranslation(
  original: string,
  translated: string,
  from: CardLang,
  to: CardLang
): boolean {
  const orig = sanitizeTextForTranslation(original);
  const trans = sanitizeTextForTranslation(translated);
  if (!trans) return false;
  if (isSameish(orig, trans)) return false;

  const detected = detectCardLanguage(trans);
  if (from !== to && detected === from) return false;
  if (to === 'pt' && detected === 'en' && from === 'en') return false;
  if (to === 'en' && detected === 'pt' && from === 'pt') return false;
  if (to === 'es' && detected === 'en' && from === 'en' && !hasSpanishMarkers(trans)) return false;

  return true;
}

async function fetchMyMemory(
  text: string,
  from: CardLang,
  to: CardLang
): Promise<string> {
  const pair = langPair(from, to);
  const url = `${API}?q=${encodeURIComponent(text)}&langpair=${pair}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const status = data?.responseStatus;
  if (status && status !== 200 && status !== '200') {
    throw new Error(data?.responseDetails || `API status ${status}`);
  }

  const translated =
    sanitizeTextForTranslation(data?.responseData?.translatedText) ||
    sanitizeTextForTranslation(data?.matches?.[0]?.translation);

  if (!translated) throw new Error('Tradução vazia');
  return translated;
}

function splitForTranslation(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!parts || parts.length < 2) {
    const mid = Math.floor(text.length / 2);
    const space = text.lastIndexOf(' ', mid);
    const cut = space > 40 ? space : mid;
    return [text.slice(0, cut).trim(), text.slice(cut).trim()].filter(Boolean);
  }
  const chunks: string[] = [];
  let buf = '';
  for (const p of parts) {
    const piece = p.trim();
    if (!piece) continue;
    if ((buf + ' ' + piece).trim().length > MAX_CHUNK && buf) {
      chunks.push(buf.trim());
      buf = piece;
    } else {
      buf = buf ? `${buf} ${piece}` : piece;
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks.length ? chunks : [text];
}

async function translateOnce(
  text: string,
  from: CardLang,
  to: CardLang
): Promise<string> {
  const chunks = splitForTranslation(text);
  if (chunks.length === 1) return fetchMyMemory(chunks[0], from, to);

  const out: string[] = [];
  for (const chunk of chunks) {
    out.push(await fetchMyMemory(chunk, from, to));
    await new Promise((r) => setTimeout(r, 120));
  }
  return out.join(' ');
}

const SOURCE_GUESSES: CardLang[] = ['en', 'es', 'pt'];

async function translateWithRetries(
  text: string,
  target: CardLang,
  preferredFrom: CardLang
): Promise<{ text: string; from: CardLang }> {
  const attempts: CardLang[] = [
    preferredFrom,
    ...SOURCE_GUESSES.filter((l) => l !== preferredFrom),
  ];

  let lastError: Error | null = null;

  for (const from of attempts) {
    if (from === target) continue;
    try {
      const translated = await translateOnce(text, from, target);
      if (isValidTranslation(text, translated, from, target)) {
        return { text: translated, from };
      }
      lastError = new Error('Tradução não alterou o idioma');
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  throw lastError || new Error('Tradução indisponível');
}

export interface TranslateOptions {
  contentId?: string;
  sourceLang?: CardLang;
  force?: boolean;
  skipCache?: boolean;
}

export async function translateCardText(
  text: string,
  target: CardLang,
  sourceLang?: CardLang,
  options?: TranslateOptions
): Promise<string> {
  const trimmed = sanitizeTextForTranslation(text);
  if (!trimmed) return safeText(text);

  const from = options?.sourceLang ?? detectCardLanguage(trimmed);
  if (!options?.force && from === target && textAppearsToBeLanguage(trimmed, target)) {
    return trimmed;
  }

  const key = cacheKey(options?.contentId, from, target, trimmed);

  if (!options?.skipCache) {
    const cache = readCache();
    const hit = cache[key];
    if (hit?.text && isValidTranslation(trimmed, hit.text, hit.from, hit.to)) {
      return hit.text;
    }
    if (hit) removeCacheEntry(key);
  }

  const { text: translated, from: usedFrom } = await translateWithRetries(
    trimmed,
    target,
    from
  );

  const store = readCache();
  store[key] = { text: translated, from: usedFrom, to: target, at: Date.now() };
  writeCache(store);

  return translated;
}

export interface CardContentSource {
  texto: string;
  titulo?: string;
  resumo?: string;
}

export interface CardContentDisplay extends CardContentSource {
  isTranslated: boolean;
  translationFailed?: boolean;
  targetLang?: CardLang;
}

export interface TranslateContentOptions {
  contentId?: string;
  force?: boolean;
  skipCache?: boolean;
}

export async function translateCardContent(
  source: CardContentSource,
  target: CardLang,
  options?: TranslateContentOptions
): Promise<CardContentDisplay> {
  const textoRaw = sanitizeTextForTranslation(source.texto);
  if (!textoRaw) {
    return { ...source, isTranslated: false };
  }

  const detected = detectCardLanguage(textoRaw);
  if (
    !options?.force &&
    detected === target &&
    textAppearsToBeLanguage(textoRaw, target)
  ) {
    return { ...source, isTranslated: false };
  }

  const baseOpts: TranslateOptions = {
    contentId: options?.contentId,
    force: options?.force,
    skipCache: options?.skipCache,
  };

  const texto = await translateCardText(textoRaw, target, detected, {
    ...baseOpts,
    contentId: options?.contentId ? `${options.contentId}:texto` : undefined,
  });

  if (isSameish(textoRaw, texto) || !textAppearsToBeLanguage(texto, target)) {
    throw new TranslationFailedError('Não foi possível traduzir o texto principal', target);
  }

  let titulo: string | undefined;
  if (source.titulo) {
    const tTitulo = sanitizeTextForTranslation(source.titulo);
    const fromT = detectCardLanguage(tTitulo);
    if (fromT !== target || options?.force) {
      titulo = await translateCardText(tTitulo, target, fromT, {
        ...baseOpts,
        contentId: options?.contentId ? `${options.contentId}:titulo` : undefined,
      });
    } else {
      titulo = source.titulo;
    }
  }

  let resumo: string | undefined;
  if (source.resumo) {
    const tResumo = sanitizeTextForTranslation(source.resumo);
    const fromR = detectCardLanguage(tResumo);
    if (fromR !== target || options?.force) {
      resumo = await translateCardText(tResumo, target, fromR, {
        ...baseOpts,
        contentId: options?.contentId ? `${options.contentId}:resumo` : undefined,
      });
    } else {
      resumo = source.resumo;
    }
  }

  return {
    texto,
    titulo,
    resumo,
    isTranslated: true,
    translationFailed: false,
    targetLang: target,
  };
}

/** Remove entradas de cache inválidas (texto igual ao original). */
export function pruneInvalidTranslationCache(): void {
  try {
    localStorage.removeItem('mm-trans-cache-v1');
  } catch {
    /* ignore */
  }
  const store = readCache();
  let changed = false;
  for (const [key, entry] of Object.entries(store)) {
    if (!entry?.text) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) writeCache(store);
}
