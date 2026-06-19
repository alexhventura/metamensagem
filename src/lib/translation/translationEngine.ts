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
import {
  isLiveTranslationEnabled,
  isQuotaOrAvailabilityError,
  markTranslationApiUnavailable,
  clearTranslationApiCooldown,
} from './translationQuota';
import { trackTranslationEvent } from '../analytics/translationAnalytics';
import {
  TranslationContingencyError as TranslationContingencyErrorClass,
  TranslationFailedError as TranslationFailedErrorClass,
} from './types';
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

const API_DIRECT = 'https://api.mymemory.translated.net/get';
const API_PROXY = '/api/translate';
/** MyMemory free tier ~500 bytes/request — chunks maiores = menos 429. */
const MAX_CHUNK = 480;
const FETCH_TIMEOUT_MS = 14_000;
const CHUNK_DELAY_MS = 140;
const BETWEEN_ATTEMPT_MS = 160;
const HEURISTIC_LANGS: CardLang[] = ['pt', 'en', 'es'];
const RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BACKOFF_MS = [800, 1600, 3200];

const IT_HINT =
  /\b(il|lo|la|i|gli|le|un|una|che|non|per|con|come|sono|essere|questo|questa|tuo|tua|nostro|vostro|anche|più|piu|molto|tutto|tutti|fare|fatto|solo|solo|ancora|già|gia|dove|quando|perché|perche|amore|vita|mondo)\b/i;

const FR_HINT =
  /\b(le|la|les|un|une|des|que|qui|pour|avec|dans|sur|est|sont|pas|plus|tout|tous|cette|cet|comme|mais|très|tres|vie|amour|monde|être|etre|nous|vous|ils|elles)\b/i;

const DE_HINT =
  /\b(der|die|das|den|dem|des|ein|eine|und|ist|sind|nicht|mit|für|fur|von|zu|auf|als|auch|nur|noch|wie|wir|sie|ihr|sein|haben|werden|kann|muss|leben|liebe|welt|wenn|dass)\b/i;

const ES_HINT =
  /\b(el|la|los|las|un|una|de|del|al|que|en|es|son|por|para|con|como|cuando|donde|muy|más|mas|este|esta|sus|hay|fue|ser|tan|también|tambien|vivimos|vivamos|lleguemos|arrepienta|incluso|enterrador|morir|vida|amor|mundo|sabiduría|sabiduria)\b/gi;

const ALL_LANGS: CardLang[] = ALL_CARD_LANGS;

const EN_STOP =
  /\b(the|and|is|are|was|were|you|your|life|love|with|for|that|this|have|from|not|but|what|all|when|we|will|can|our|out|day|get|has|how|its|may|new|now|old|see|two|way|who|let|say|she|too|use|her|been|come|does|each|even|into|just|like|long|make|many|most|much|must|only|over|such|take|than|them|then|they|very|well|also|back|being|call|first|give|good|great|hand|high|home|keep|know|last|left|live|look|made|mind|more|name|need|never|next|once|part|people|place|right|same|some|still|think|those|though|through|time|turn|under|until|want|while|world|year|after|again|before|between|both|could|during|every|found|going|might|other|shall|since|something|these|thing|three|upon|where|which|without|would|die|sorry|undertaker)\b/i;

const PT_STOP =
  /\b(não|nao|que|uma|para|com|você|voce|vida|amor|ser|mais|como|mas|por|seu|sua|isso|essa|este|esta|aos|das|nos|nas|pelo|pela|ainda|muito|todo|toda|todos|todas|onde|quando|porque|porquê|será|sera|está|esta|estao|estão|são|sao|tem|ter|foi|nos|vos|lhe|lhes|compartilhar|sabedoria|conhecimento)\b/i;

const ES_STOP =
  /\b(el|la|los|las|que|por|para|con|vida|amor|más|mas|una|uno|del|al|son|está|esta|están|como|pero|todo|toda|todos|todas|muy|sin|sobre|entre|cuando|donde|porque|ser|hay|han|fue|era|sus|ese|esa|esto|estos|también|tambien|está|estan|mundo|sabiduría|sabiduria|conocimiento|compartir|respuesta|amor)\b/i;

export {
  TranslationFailedErrorClass as TranslationFailedError,
  TranslationContingencyErrorClass as TranslationContingencyError,
};

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

function hasJapaneseScript(text: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(text);
}

function hasDevanagariScript(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

function isMyMemoryQuotaOrError(text: string): boolean {
  return /MYMEMORY\s+WARNING|QUOTA\s+FINISHED|INVALID\s+LANGUAGE\s+PAIR/i.test(text);
}

function matchesTargetLanguage(
  translated: string,
  to: CardLang,
  original?: string
): boolean {
  if (isMyMemoryQuotaOrError(translated)) return false;

  if (to === 'ja') return hasJapaneseScript(translated);
  if (to === 'zh') return hasJapaneseScript(translated);
  if (to === 'hi') return hasDevanagariScript(translated);
  if (to === 'it') {
    return (
      IT_HINT.test(translated) ||
      /[àèéìòù]/i.test(translated) ||
      (!looksEnglish(translated) && !looksPortuguese(translated) && translated.length >= 4)
    );
  }
  if (to === 'fr') return FR_HINT.test(translated) || /[àâçéèêëîïôùûü]/i.test(translated);
  if (to === 'de') return DE_HINT.test(translated) || /[äöüß]/i.test(translated);

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
  if (isMyMemoryQuotaOrError(trans)) return false;

  if (!matchesTargetLanguage(trans, to, orig)) return false;

  if (!HEURISTIC_LANGS.includes(to)) {
    return trans.length >= 1;
  }

  if (to === 'es' && isLikelySpanish(trans, orig)) return true;

  const detTrans = detectCardLanguage(trans);
  if (detTrans === from && from !== to && to !== 'es') return false;
  if (detTrans === from && from !== to && to === 'es' && countSpanishHints(trans) < 2) {
    return false;
  }

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

async function fetchMyMemoryOnce(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Tempo esgotado na tradução');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
  const contact =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_MYMEMORY_EMAIL === 'string'
      ? import.meta.env.VITE_MYMEMORY_EMAIL.trim()
      : '';

  const buildUrl = (base: string) => {
    let u = `${base}?q=${encodeURIComponent(payload)}&langpair=${pair}`;
    if (contact && base === API_DIRECT) u += `&de=${encodeURIComponent(contact)}`;
    return u;
  };

  const endpoints =
    typeof window !== 'undefined'
      ? [API_PROXY, API_DIRECT]
      : [API_DIRECT];

  let res: Response | null = null;
  let lastRateError: Error | null = null;
  let lastUrl = buildUrl(endpoints[0]);

  outer: for (const base of endpoints) {
    lastUrl = buildUrl(base);
    for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
      res = await fetchMyMemoryOnce(lastUrl);
      if (res.status === 404 && base === API_PROXY) {
        continue outer;
      }
      if (res.status !== 429) break outer;
      lastRateError = new Error('Limite da API de tradução (aguarde e tente de novo)');
      const wait = RATE_LIMIT_BACKOFF_MS[attempt];
      if (wait == null) break outer;
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  if (!res) throw lastRateError || new Error('Falha na tradução');
  if (res.status === 429) {
    markTranslationApiUnavailable('HTTP 429');
    throw lastRateError || new Error('HTTP 429');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  if (data?.unavailable === true) {
    markTranslationApiUnavailable('unavailable');
    throw new Error('Tradução indisponível');
  }
  if (data?.quotaFinished) {
    markTranslationApiUnavailable('quotaFinished');
    throw new Error('Cota diária de tradução esgotada');
  }

  const status = data?.responseStatus;
  if (status && status !== 200 && status !== '200') {
    throw new Error(data?.responseDetails || `API status ${status}`);
  }

  const origRef = originalFull || text;
  const candidates: string[] = [];
  const primary = sanitizeTextForTranslation(data?.responseData?.translatedText);
  if (primary && !isMyMemoryQuotaOrError(primary)) candidates.push(primary);

  for (const m of data?.matches || []) {
    const c = sanitizeTextForTranslation(m?.translation);
    if (c && !isMyMemoryQuotaOrError(c) && !candidates.includes(c)) candidates.push(c);
  }

  for (const cand of candidates) {
    if (isSameish(text, cand) || isSameish(origRef, cand)) continue;
    if (isValidTranslation(origRef, cand, from, to)) return cand;
    if (to === 'es' && isLikelySpanish(cand, origRef)) return cand;
  }

  if (primary && !isSameish(text, primary) && !isMyMemoryQuotaOrError(primary)) return primary;
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
    await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
  }
  const joined = joinTranslatedChunks(out);
  if (!isValidTranslation(text, joined, from, to) && to === 'es' && !isLikelySpanish(joined, text)) {
    throw new Error('Tradução em blocos não validou');
  }
  return joined;
}

/** Poucas origens — evita dezenas de chamadas e HTTP 429 no MyMemory. */
function sourceAttemptOrder(preferred: CardLang, target: CardLang): CardLang[] {
  const order: CardLang[] = [];
  if (preferred !== target) order.push(preferred);
  if (!order.includes('en') && target !== 'en') order.push('en');
  if (target === 'es' && !order.includes('pt')) order.push('pt');
  if (target === 'es' && !order.includes('en')) order.push('en');
  return order;
}

function pivotLanguages(from: CardLang, target: CardLang): CardLang[] {
  const pivots: CardLang[] = [];
  if (from !== 'en' && target !== 'en') pivots.push('en');
  if (target === 'es' && from !== 'pt' && from !== 'es') pivots.push('pt');
  return pivots;
}

async function translateViaPivot(
  text: string,
  from: CardLang,
  to: CardLang
): Promise<string> {
  let lastError: Error | null = null;

  for (const pivot of pivotLanguages(from, to)) {
    try {
      const mid = await translateOnce(text, from, pivot, pivot !== 'en');
      if (!isValidTranslation(text, mid, from, pivot)) continue;
      await new Promise((r) => setTimeout(r, BETWEEN_ATTEMPT_MS));
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

  attemptLoop: for (const from of sources) {
    if (from === target) continue;
    const tryLower = from === 'en' || from === preferredFrom;
    for (const forceLower of tryLower ? [false, true] : [false]) {
      try {
        const translated = await translateOnce(text, from, target, forceLower);
        if (isValidTranslation(text, translated, from, target)) {
          return { text: translated, from };
        }
        lastError = new Error('Tradução direta não validou');
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (lastError.message.includes('429') || /cota|quota|Limite da API/i.test(lastError.message)) {
          break attemptLoop;
        }
      }
      await new Promise((r) => setTimeout(r, BETWEEN_ATTEMPT_MS));
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
  if (!options?.force && !isLiveTranslationEnabled()) {
    throw new TranslationContingencyErrorClass(
      'Modo de contingência ativo',
      target,
      false
    );
  }

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

  let translated: string;
  let usedFrom: CardLang;
  try {
    const result = await translateWithRetries(trimmed, target, from);
    translated = result.text;
    usedFrom = result.from;
    clearTranslationApiCooldown();
  } catch (e) {
    if (isQuotaOrAvailabilityError(e)) {
      markTranslationApiUnavailable(e instanceof Error ? e.message : 'quota');
      trackTranslationEvent('translation_fallback', {
        phrase_id: options?.contentId,
        locale: target,
        mode: 'contingency',
      });
      throw new TranslationContingencyErrorClass(
        'Tradução em tempo real indisponível',
        target,
        false
      );
    }
    throw e;
  }

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

  trackTranslationEvent('translation_success', {
    phrase_id: options?.contentId,
    locale: target,
    mode: 'live',
  });

  return translated;
}

async function translateOptionalField(
  value: string | undefined,
  target: CardLang,
  options: TranslateContentOptions | undefined,
  fieldSuffix: string
): Promise<string | undefined> {
  if (!value?.trim()) return undefined;
  try {
    return await translateField(value, target, options, fieldSuffix);
  } catch {
    return undefined;
  }
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

  // Traduz cada campo pelo idioma detectado — evita pular explicação PT em frase EN (e vice-versa).
  let texto = textoRaw;
  try {
    const translated = await translateField(textoRaw, target, options, 'texto');
    if (translated) texto = translated;
  } catch {
    const det = options?.sourceLang
      ? { lang: options.sourceLang, confidence: 1 }
      : detectCardLanguageWithConfidence(textoRaw);
    if (det.lang !== target || det.confidence < 0.55) {
      throw new TranslationFailedErrorClass('Não foi possível traduzir o texto principal', target);
    }
  }

  const titulo = await translateOptionalField(source.titulo, target, options, 'titulo');
  const resumo = await translateOptionalField(source.resumo, target, options, 'resumo');

  let autor = source.autor;
  if (source.autor && shouldTranslateAuthor(source.autor)) {
    try {
      const translatedAutor = await translateField(source.autor, target, options, 'autor');
      if (translatedAutor) autor = translatedAutor;
    } catch {
      /* mantém autor original */
    }
  }

  const explicacao = await translateOptionalField(source.explicacao, target, options, 'explicacao');

  const norm = (s: string | undefined) => sanitizeTextForTranslation(s ?? '');
  const changed =
    norm(texto) !== norm(textoRaw) ||
    (source.titulo != null && titulo != null && norm(titulo) !== norm(source.titulo)) ||
    (source.resumo != null && resumo != null && norm(resumo) !== norm(source.resumo)) ||
    (source.explicacao != null && explicacao != null && norm(explicacao) !== norm(source.explicacao)) ||
    (source.autor != null && autor != null && norm(autor) !== norm(source.autor));

  return {
    texto,
    titulo: titulo ?? source.titulo,
    resumo: resumo ?? source.resumo,
    autor: resolveTranslatedAuthor(source.autor, autor),
    explicacao: explicacao ?? source.explicacao,
    isTranslated: changed,
    translationFailed: false,
    targetLang: changed ? target : undefined,
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
      continue;
    }
    if (entry.language === 'ja' && !hasJapaneseScript(entry.text)) {
      delete store[key];
      changed = true;
      continue;
    }
    if (entry.language === 'hi' && !hasDevanagariScript(entry.text)) {
      delete store[key];
      changed = true;
      continue;
    }
    if (isMyMemoryQuotaOrError(entry.text)) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) writeTranslationCache(store);
}
