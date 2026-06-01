import { safeText } from '../safeContent';
import {
  sanitizeTextForTranslation,
  stripOuterQuotes,
  textForTranslationApi,
} from '../textSanitize';
import { ALL_CARD_LANGS, toMyMemoryLang } from './cardLanguages';
import {
  cacheStorageKey,
  computeSourceHash,
  readTranslationCache,
  removeCacheEntry,
  writeTranslationCache,
  pruneLegacyTranslationCaches,
} from './translationCache';
import type {
  CardContentDisplay,
  CardContentSource,
  CardLang,
  LanguageDetection,
  TranslateContentOptions,
  TranslateOptions,
} from './types';
import { TranslationFailedError as TranslationFailedErrorClass } from './types';
import { resolveTranslatedAuthor, shouldTranslateAuthor } from './authorPolicy';

export { shouldTranslateAuthor, resolveTranslatedAuthor } from './authorPolicy';
import {
  countSpanishHints,
  detectCardLanguage,
  detectCardLanguageWithConfidence,
  looksSpanishText as looksSpanish,
} from './detect';

export {
  detectCardLanguage,
  detectCardLanguageWithConfidence,
  detectLanguage,
  textAppearsToBeLanguage,
} from './detect';

export { sanitizeTextForTranslation, stripOuterQuotes } from '../textSanitize';

/** Motor de tradução (MyMemory) — import dinâmico apenas sob demanda. */

const API = 'https://api.mymemory.translated.net/get';
const MAX_CHUNK = 90;
const FETCH_TIMEOUT_MS = 14_000;
const HEURISTIC_LANGS: CardLang[] = ['pt', 'en', 'es'];

const ES_HINT =
  /\b(el|la|los|las|un|una|de|del|al|que|en|es|son|por|para|con|como|cuando|donde|muy|más|mas|este|esta|sus|hay|fue|ser|tan|también|tambien|vivimos|vivamos|lleguemos|arrepienta|incluso|enterrador|morir|vida|amor|mundo|sabiduría|sabiduria)\b/gi;

const ALL_LANGS: CardLang[] = ALL_CARD_LANGS;

const EN_STOP =
  /\b(the|and|is|are|was|were|you|your|life|love|with|for|that|this|have|from|not|but|what|all|when|we|will|can|our|out|day|get|has|how|its|may|new|now|old|see|two|way|who|let|say|she|too|use|her|been|come|does|each|even|into|just|like|long|make|many|most|much|must|only|over|such|take|than|them|then|they|very|well|also|back|being|call|first|give|good|great|hand|high|home|keep|know|last|left|live|look|made|mind|more|name|need|never|next|once|part|people|place|right|same|some|still|think|those|though|through|time|turn|under|until|want|while|world|year|after|again|before|between|both|could|during|every|found|going|might|other|shall|since|something|these|thing|three|upon|where|which|without|would|die|sorry|undertaker)\b/i;

const PT_STOP =
  /\b(não|nao|que|uma|para|com|você|voce|vida|amor|ser|mais|como|mas|por|seu|sua|isso|essa|este|esta|aos|das|nos|nas|pelo|pela|ainda|muito|todo|toda|todos|todas|onde|quando|porque|porquê|será|sera|está|esta|estao|estão|são|sao|tem|ter|foi|nos|vos|lhe|lhes|compartilhar|sabedoria|conhecimento)\b/i;

const ES_STOP =
  /\b(el|la|los|las|que|por|para|con|vida|amor|más|mas|una|uno|del|al|son|está|esta|están|como|pero|todo|toda|todos|todas|muy|sin|sobre|entre|cuando|donde|porque|ser|hay|han|fue|era|sus|ese|esa|esto|estos|también|tambien|está|estan|mundo|sabiduría|sabiduria|conocimiento|compartir|respuesta|amor)\b/i;

export { TranslationFailedErrorClass as TranslationFailedError };

function langPair(from: CardLang, to: CardLang): string {
  return `${toMyMemoryLang(from)}|${toMyMemoryLang(to)}`;
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
  if (longer.includes(shorter) && shorter.length / longer.length > 0.88) return true;
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
  return capped / words.length >= 0.5 && !hasPortugueseDiacritics(text);
}

function looksPortuguese(text: string): boolean {
  const t = sanitizeTextForTranslation(text);
  return hasPortugueseDiacritics(t) || PT_STOP.test(t.toLowerCase());
}

function looksEnglish(text: string): boolean {
  const t = sanitizeTextForTranslation(text);
  return EN_STOP.test(t.toLowerCase()) || looksEnglishTitleCase(t);
}

/** PT e ES compartilham palavras — validação mais tolerante para destino ES. */
function isLikelySpanish(translated: string, original: string): boolean {
  const trans = sanitizeTextForTranslation(translated);
  const orig = sanitizeTextForTranslation(original);
  if (!trans || isSameish(trans, orig)) return false;
  if (looksSpanish(trans)) return true;
  if (countSpanishHints(trans) >= 2) return true;
  if (hasSpanishMarkers(trans) && countSpanishHints(trans) >= 1) return true;
  if (/[áéíóúñ¿¡]/i.test(trans) && countSpanishHints(trans) >= 1) return true;
  return false;
}

function matchesTargetLanguage(
  translated: string,
  to: CardLang,
  original?: string
): boolean {
  if (to === 'es') {
    if (original && isLikelySpanish(translated, original)) return true;
    if (looksSpanish(translated)) return true;
    if (original && !isSameish(translated, original) && countSpanishHints(translated) >= 2) {
      return true;
    }
    return detectCardLanguage(translated) === 'es';
  }
  if (to === 'pt') return looksPortuguese(translated) || detectCardLanguage(translated) === 'pt';
  if (to === 'en') return looksEnglish(translated) || detectCardLanguage(translated) === 'en';
  return true;
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
  if (from === to) return false;

  if (!HEURISTIC_LANGS.includes(to)) {
    return trans.length >= 1;
  }

  if (to === 'es' && isLikelySpanish(trans, orig)) return true;

  const detTrans = detectCardLanguage(trans);
  if (detTrans === from && from !== to && to !== 'es') return false;
  if (detTrans === from && from !== to && to === 'es' && countSpanishHints(trans) < 2) {
    return false;
  }

  if (!matchesTargetLanguage(trans, to, orig)) return false;

  if (to === 'es' && from === 'en' && looksEnglish(trans) && !looksSpanish(trans) && countSpanishHints(trans) < 2) {
    return false;
  }
  if (to === 'en' && from === 'es' && looksSpanish(trans) && !looksEnglish(trans)) return false;
  if (to === 'pt' && (from === 'en' || from === 'es') && !looksPortuguese(trans) && detTrans !== 'pt') {
    return false;
  }

  return true;
}

function prepareTextForApi(text: string, from: CardLang, forceLower = false): string {
  let t = textForTranslationApi(text);
  const titleCase =
    looksEnglishTitleCase(t) || (from === 'en' && /^[A-Z]/.test(t) && !hasPortugueseDiacritics(t));
  if (forceLower || titleCase) {
    t = t.toLowerCase();
  }
  return stripOuterQuotes(t);
}

function joinTranslatedChunks(parts: string[]): string {
  const joined = parts
    .map((p) => sanitizeTextForTranslation(p))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!joined) return joined;
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

async function fetchMyMemory(
  text: string,
  from: CardLang,
  to: CardLang,
  originalFull?: string
): Promise<string> {
  const pair = langPair(from, to);
  const payload = textForTranslationApi(text);
  if (!payload) throw new Error('Texto vazio após sanitização');
  const url = `${API}?q=${encodeURIComponent(payload)}&langpair=${pair}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Tempo esgotado na tradução');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const status = data?.responseStatus;
  if (status && status !== 200 && status !== '200') {
    throw new Error(data?.responseDetails || `API status ${status}`);
  }

  const origRef = originalFull || text;
  const candidates: string[] = [];
  const primary = sanitizeTextForTranslation(data?.responseData?.translatedText);
  if (primary) candidates.push(primary);

  for (const m of data?.matches || []) {
    const c = sanitizeTextForTranslation(m?.translation);
    if (c && !candidates.includes(c)) candidates.push(c);
  }

  for (const cand of candidates) {
    if (isSameish(text, cand) || isSameish(origRef, cand)) continue;
    if (isValidTranslation(origRef, cand, from, to)) return cand;
    if (to === 'es' && isLikelySpanish(cand, origRef)) return cand;
  }

  if (primary && !isSameish(text, primary)) return primary;
  throw new Error('Tradução vazia ou igual ao original');
}

function splitForTranslation(text: string): string[] {
  const clean = textForTranslationApi(text);
  if (!clean) return [];
  if (clean.length <= MAX_CHUNK) return [clean];

  const bySentence = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  const segments: string[] = [];

  const pushSegment = (seg: string) => {
    const s = seg.trim();
    if (!s) return;
    if (s.length <= MAX_CHUNK) {
      segments.push(s);
      return;
    }
    const words = s.split(/\s+/);
    let buf = '';
    for (const w of words) {
      const next = buf ? `${buf} ${w}` : w;
      if (next.length > MAX_CHUNK && buf) {
        segments.push(buf);
        buf = w;
      } else {
        buf = next;
      }
    }
    if (buf) segments.push(buf);
  };

  if (bySentence && bySentence.length > 1) {
    for (const p of bySentence) pushSegment(p);
  } else {
    pushSegment(clean);
  }

  if (!segments.length && clean.length > MAX_CHUNK) {
    const clauses = clean.split(/,\s+/);
    if (clauses.length > 1) {
      for (const c of clauses) pushSegment(c);
    }
  }

  return segments.length ? segments : [clean];
}

async function translateOnce(
  text: string,
  from: CardLang,
  to: CardLang,
  forceLower = false
): Promise<string> {
  const prepared = prepareTextForApi(text, from, forceLower);
  const chunks = splitForTranslation(prepared);
  if (chunks.length === 1) return fetchMyMemory(chunks[0], from, to, text);

  const out: string[] = [];
  for (const chunk of chunks) {
    out.push(await fetchMyMemory(chunk, from, to, text));
    await new Promise((r) => setTimeout(r, 110));
  }
  const joined = joinTranslatedChunks(out);
  if (!isValidTranslation(text, joined, from, to) && to === 'es' && !isLikelySpanish(joined, text)) {
    throw new Error('Tradução em blocos não validou');
  }
  return joined;
}

function sourceAttemptOrder(preferred: CardLang, target: CardLang): CardLang[] {
  const pivotFirst: CardLang[] = ['en', 'pt', 'es', 'fr', 'de', 'it'];
  if (target === 'es') {
    return [...new Set<CardLang>([...pivotFirst, preferred, ...ALL_LANGS])].filter((l) => l !== 'es');
  }
  if (target === 'ja' || target === 'hi') {
    return [...new Set<CardLang>(['en', 'pt', preferred, ...pivotFirst, ...ALL_LANGS])].filter(
      (l) => l !== target
    );
  }
  return [...new Set<CardLang>([preferred, ...pivotFirst, ...ALL_LANGS])].filter((l) => l !== target);
}

async function translateViaPivot(
  text: string,
  from: CardLang,
  to: CardLang
): Promise<string> {
  const pivots = ALL_LANGS.filter((l) => l !== from && l !== to);
  let lastError: Error | null = null;

  for (const pivot of pivots) {
    try {
      const mid = await translateOnce(text, from, pivot, true);
      if (!isValidTranslation(text, mid, from, pivot)) continue;
      await new Promise((r) => setTimeout(r, 120));
      const final = await translateOnce(mid, pivot, to, false);
      if (isValidTranslation(text, final, from, to)) return final;
      lastError = new Error('Pivot não validou destino');
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError || new Error('Tradução via pivô indisponível');
}

async function translateWithRetries(
  text: string,
  target: CardLang,
  preferredFrom: CardLang
): Promise<{ text: string; from: CardLang }> {
  const sources = sourceAttemptOrder(preferredFrom, target);

  let lastError: Error | null = null;

  for (const from of sources) {
    if (from === target) continue;
    for (const forceLower of [false, true]) {
      try {
        const translated = await translateOnce(text, from, target, forceLower);
        if (isValidTranslation(text, translated, from, target)) {
          return { text: translated, from };
        }
        lastError = new Error('Tradução direta não validou');
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  try {
    const pivoted = await translateViaPivot(text, preferredFrom, target);
    return { text: pivoted, from: preferredFrom };
  } catch (e) {
    lastError = e instanceof Error ? e : new Error(String(e));
  }

  throw lastError || new Error('Tradução indisponível');
}

export async function translateCardText(
  text: string,
  target: CardLang,
  sourceLang?: CardLang,
  options?: TranslateOptions
): Promise<string> {
  const trimmed = sanitizeTextForTranslation(text);
  if (!trimmed) return safeText(text);

  const detection = sourceLang
    ? { lang: sourceLang, confidence: 1 }
    : detectCardLanguageWithConfidence(trimmed);
  const from = detection.lang;

  if (
    !options?.force &&
    from === target &&
    detection.confidence >= 0.55 &&
    textAppearsToBeLanguage(trimmed, target)
  ) {
    return trimmed;
  }

  const key = cacheStorageKey(options?.contentId, target, trimmed);
  const sourceHash = computeSourceHash(trimmed);

  if (!options?.skipCache) {
    const cache = readTranslationCache();
    const hit = cache[key];
    if (
      hit?.text &&
      hit.sourceHash === sourceHash &&
      hit.language === target &&
      isValidTranslation(trimmed, hit.text, hit.from, hit.language)
    ) {
      return hit.text;
    }
    if (hit) removeCacheEntry(key);
  }

  const { text: translated, from: usedFrom } = await translateWithRetries(trimmed, target, from);

  if (
    !isValidTranslation(trimmed, translated, usedFrom, target) &&
    !(target === 'es' && isLikelySpanish(translated, trimmed))
  ) {
    throw new TranslationFailedErrorClass('Tradução inválida', target);
  }

  const store = readTranslationCache();
  store[key] = {
    contentId: safeText(options?.contentId) || key.split('::')[0],
    language: target,
    text: translated,
    from: usedFrom,
    sourceHash,
    at: Date.now(),
  };
  writeTranslationCache(store);

  return translated;
}

async function translateField(
  value: string | undefined,
  target: CardLang,
  options: TranslateContentOptions | undefined,
  fieldSuffix: string
): Promise<string | undefined> {
  if (!value) return undefined;
  const clean = sanitizeTextForTranslation(value);
  if (!clean) return value;

  const det = detectCardLanguageWithConfidence(clean);
  if (!options?.force && det.lang === target && det.confidence >= 0.55 && textAppearsToBeLanguage(clean, target)) {
    return value;
  }

  const translated = await translateCardText(clean, target, det.lang, {
    contentId: options?.contentId ? `${options.contentId}:${fieldSuffix}` : undefined,
    force: options?.force,
    skipCache: options?.skipCache,
  });

  if (
    isSameish(clean, translated) ||
    (!isValidTranslation(clean, translated, det.lang, target) &&
      !(target === 'es' && isLikelySpanish(translated, clean)))
  ) {
    throw new TranslationFailedErrorClass(`Falha ao traduzir ${fieldSuffix}`, target);
  }

  return translated;
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

  const textoDet = detectCardLanguageWithConfidence(textoRaw);
  if (
    !options?.force &&
    textoDet.lang === target &&
    textoDet.confidence >= 0.55 &&
    textAppearsToBeLanguage(textoRaw, target)
  ) {
    return { ...source, isTranslated: false };
  }

  const texto = await translateField(textoRaw, target, options, 'texto');
  const titulo = await translateField(source.titulo, target, options, 'titulo');
  const resumo = await translateField(source.resumo, target, options, 'resumo');

  if (
    !texto ||
    isSameish(textoRaw, texto) ||
    (!isValidTranslation(textoRaw, texto, textoDet.lang, target) &&
      !(target === 'es' && isLikelySpanish(texto, textoRaw)))
  ) {
    throw new TranslationFailedErrorClass('Não foi possível traduzir o texto principal', target);
  }

  let autor = source.autor;
  if (source.autor && shouldTranslateAuthor(source.autor)) {
    autor = await translateField(source.autor, target, options, 'autor');
  }
  const explicacao = await translateField(source.explicacao, target, options, 'explicacao');

  return {
    texto,
    titulo,
    resumo,
    autor: resolveTranslatedAuthor(source.autor, autor),
    explicacao,
    isTranslated: true,
    translationFailed: false,
    targetLang: target,
  };
}

export function pruneInvalidTranslationCache(): void {
  pruneLegacyTranslationCaches();
  const store = readTranslationCache();
  let changed = false;
  for (const [key, entry] of Object.entries(store)) {
    if (!entry?.text || !entry.language || entry.text.length < 2) {
      delete store[key];
      changed = true;
      continue;
    }
    if (
      entry.language === 'es' &&
      countSpanishHints(entry.text) < 2 &&
      !looksSpanish(entry.text)
    ) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) writeTranslationCache(store);
}
