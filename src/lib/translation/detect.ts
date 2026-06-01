import { sanitizeTextForTranslation } from '../textSanitize';
import type { CardLang, LanguageDetection } from './types';

const ES_HINT =
  /\b(el|la|los|las|un|una|de|del|al|que|en|es|son|por|para|con|como|cuando|donde|muy|más|mas|este|esta|sus|hay|fue|ser|tan|también|tambien)\b/gi;

const EN_STOP =
  /\b(the|and|is|are|was|were|you|your|life|love|with|for|that|this|have|from|not|but|what|all|when|we|will|can|our)\b/i;

const PT_STOP =
  /\b(não|nao|que|uma|para|com|você|voce|vida|amor|ser|mais|como|mas|por|seu|sua)\b/i;

const ES_STOP =
  /\b(el|la|los|las|que|por|para|con|vida|amor|más|mas|una|del|al|son|está|como|pero|todo|muy)\b/i;

function detectScriptLang(raw: string): CardLang | null {
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(raw)) return 'ja';
  if (/[\u0900-\u097F]/.test(raw)) return 'hi';
  return null;
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

function scoreLanguage(raw: string): { pt: number; en: number; es: number } {
  const t = raw.toLowerCase();
  const ptMarks = (raw.match(/[\u0300-\u036f]/g) || []).length;
  const pt = ptMarks * 2 + (PT_STOP.test(t) ? 4 : 0) + (hasPortugueseDiacritics(raw) ? 5 : 0);
  const es = (raw.includes('ñ') ? 4 : 0) + (ES_STOP.test(t) ? 4 : 0);
  let en = EN_STOP.test(t) ? 4 : 0;
  if (looksEnglishTitleCase(raw)) en += 5;
  if (!hasPortugueseDiacritics(raw) && !hasSpanishMarkers(raw) && /^[\x20-\x7E'".,!?;:()\-–—]+$/.test(raw)) {
    en += 1;
  }
  return { pt, en, es };
}

function pickLangFromScores(scores: { pt: number; en: number; es: number }): LanguageDetection {
  const { pt, en, es } = scores;
  const total = pt + en + es;
  const max = Math.max(pt, en, es);
  if (max === 0) return { lang: 'en', confidence: 0.2 };
  let lang: CardLang = 'en';
  if (pt === max) lang = 'pt';
  else if (es === max) lang = 'es';
  return { lang, confidence: total > 0 ? max / total : 0 };
}

export function detectCardLanguageWithConfidence(text: unknown): LanguageDetection {
  const raw = sanitizeTextForTranslation(text);
  if (!raw) return { lang: 'pt', confidence: 0 };

  const scriptLang = detectScriptLang(raw);
  if (scriptLang) return { lang: scriptLang, confidence: 0.88 };

  const picked = pickLangFromScores(scoreLanguage(raw));
  if (picked.confidence < 0.35) {
    if (looksEnglishTitleCase(raw)) return { lang: 'en', confidence: 0.5 };
    if (hasPortugueseDiacritics(raw)) return { lang: 'pt', confidence: 0.5 };
    if (hasSpanishMarkers(raw)) return { lang: 'es', confidence: 0.5 };
  }
  return picked;
}

export function detectCardLanguage(text: unknown): CardLang {
  return detectCardLanguageWithConfidence(text).lang;
}

export function detectLanguage(text: unknown): CardLang {
  return detectCardLanguage(text);
}

function looksPortuguese(text: string): boolean {
  const t = sanitizeTextForTranslation(text);
  return hasPortugueseDiacritics(t) || PT_STOP.test(t.toLowerCase());
}

function looksEnglish(text: string): boolean {
  const t = sanitizeTextForTranslation(text);
  return EN_STOP.test(t.toLowerCase()) || looksEnglishTitleCase(t);
}

function looksSpanish(text: string): boolean {
  const t = sanitizeTextForTranslation(text);
  return hasSpanishMarkers(t) || ES_STOP.test(t.toLowerCase());
}

export function textAppearsToBeLanguage(text: unknown, lang: CardLang): boolean {
  const t = sanitizeTextForTranslation(text);
  if (!t) return true;
  const { lang: detected, confidence } = detectCardLanguageWithConfidence(t);
  if (confidence < 0.45) return false;
  if (['fr', 'de', 'it', 'ja', 'hi'].includes(lang)) return detected === lang;
  if (detected !== lang) return false;
  if (lang === 'pt') return looksPortuguese(t);
  if (lang === 'es') return looksSpanish(t);
  if (lang === 'en') return looksEnglish(t);
  return true;
}

export function countSpanishHints(text: string): number {
  const t = sanitizeTextForTranslation(text).toLowerCase();
  return (t.match(ES_HINT) || []).length;
}

export function looksSpanishText(text: string): boolean {
  return looksSpanish(text);
}
