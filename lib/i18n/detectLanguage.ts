/**
 * Detecção de idioma original (heurística local, custo zero).
 */

import type { SeoLocale } from './locales';

const PT =
  /\b(não|nao|você|voce|uma|para|como|mais|vida|amor|ser|está|esta|são|sao|que|com|por|mas|muito|também|tambem|ainda|onde|quando|porque|nosso|nossa|ele|ela|eles|elas)\b/i;
const EN =
  /\b(the|and|you|your|life|love|with|for|that|this|have|from|not|but|what|all|when|we|will|can|our|they|their|there|would|could|should|about|into|through|during|before|after|above|below|between)\b/i;
const ES =
  /\b(el|la|los|las|un|una|de|del|al|que|en|es|son|por|para|con|como|cuando|donde|muy|más|mas|este|esta|sus|hay|fue|ser|tan|también|tambien|vida|amor|mundo)\b/i;
const FR =
  /\b(le|la|les|un|une|des|de|du|au|que|en|est|sont|pour|avec|comme|très|tres|ce|cette|nous|vous|ils|elles|pas|plus|mais|dans|sur|par|ne|je|tu|il|elle|vie|amour)\b/i;
const DE =
  /\b(der|die|das|den|dem|des|ein|eine|und|ist|sind|nicht|mit|für|fur|auf|aus|bei|nach|über|uber|auch|als|wie|wir|ihr|sie|er|sie|es|ich|du|leben|liebe)\b/i;
const IT =
  /\b(il|lo|la|i|gli|le|un|una|che|non|per|con|come|più|piu|questo|questa|sono|essere|stato|nella|nel|della|del|degli|delle|anche|ma|se|noi|voi|loro|vita|amore)\b/i;

function scoreLang(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

/** Devanagari → hi; CJK predominante → ja */
function scriptHint(text: string): SeoLocale | null {
  let dev = 0;
  let cjk = 0;
  let latin = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c >= 0x0900 && c <= 0x097f) dev++;
    else if (c >= 0x3040 && c <= 0x9fff) cjk++;
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) latin++;
  }
  const total = dev + cjk + latin || 1;
  if (dev / total > 0.15) return 'hi';
  if (cjk / total > 0.2) return 'ja';
  return null;
}

export function detectLanguageOriginal(text: string): SeoLocale {
  const t = text.trim();
  if (!t) return 'pt';

  const script = scriptHint(t);
  if (script) return script;

  const scores: Record<SeoLocale, number> = {
    pt: scoreLang(t, PT) * 1.2,
    en: scoreLang(t, EN),
    es: scoreLang(t, ES) * 1.1,
    fr: scoreLang(t, FR) * 1.1,
    de: scoreLang(t, DE) * 1.1,
    it: scoreLang(t, IT) * 1.1,
    ja: 0,
    hi: 0,
  };

  let best: SeoLocale = 'en';
  let max = -1;
  for (const lang of Object.keys(scores) as SeoLocale[]) {
    if (scores[lang] > max) {
      max = scores[lang];
      best = lang;
    }
  }
  if (max < 1) return 'en';
  return best;
}
