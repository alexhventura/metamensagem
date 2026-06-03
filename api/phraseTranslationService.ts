/**
 * Cache global de traduções: Supabase lookup → MyMemory → upsert.
 * Chave canônica: frase_id + locale (slug imutável para cache local/CDN).
 */
import { hashPhraseSourceText } from '../lib/translation/sourceHash.js';
import { getServerSupabase, getServerSupabaseServiceRole } from './_supabaseServer.js';
import { isSeoLocale } from './_shared.js';

const LANG_MAP: Record<string, string> = {
  pt: 'pt-BR',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'ja',
  hi: 'hi',
};

export type PhraseTranslationHit = {
  texto: string;
  explicacao: string | null;
  locale_origem: string;
  source_hash: string;
};

export async function lookupPhraseTranslation(
  fraseId: string,
  locale: string,
  sourceText: string
): Promise<PhraseTranslationHit | null> {
  if (!isSeoLocale(locale)) return null;

  const sb = getServerSupabase();
  if (!sb) return null;

  const expectedHash = hashPhraseSourceText(sourceText);
  const { data, error } = await sb
    .from('frases_traducoes')
    .select('texto, explicacao, source_hash, locale_origem')
    .eq('frase_id', fraseId)
    .eq('locale', locale)
    .eq('is_official', true)
    .maybeSingle();

  if (error || !data?.texto?.trim()) return null;
  if (data.source_hash !== expectedHash) return null;

  return {
    texto: String(data.texto).trim(),
    explicacao: data.explicacao ? String(data.explicacao) : null,
    locale_origem: String(data.locale_origem || 'pt'),
    source_hash: String(data.source_hash),
  };
}

export async function upsertPhraseTranslation(input: {
  fraseId: string;
  locale: string;
  sourceText: string;
  translatedText: string;
  localeOrigem: string;
  explicacao?: string | null;
}): Promise<boolean> {
  const sb = getServerSupabaseServiceRole();
  if (!sb) return false;

  const { error } = await sb.from('frases_traducoes').upsert(
    {
      frase_id: input.fraseId,
      locale: input.locale,
      texto: input.translatedText.trim(),
      explicacao: input.explicacao ?? null,
      source_hash: hashPhraseSourceText(input.sourceText),
      locale_origem: input.localeOrigem,
      provider: 'api',
      is_official: true,
    },
    { onConflict: 'frase_id,locale' }
  );

  if (error) {
    console.error('[phrase-translation] upsert', input.fraseId, input.locale, error.message);
    return false;
  }
  return true;
}

function detectSourceLocale(text: string): string {
  if (/[áàâãéêíóôõúç]/i.test(text)) return 'pt';
  if (/[ñ¿¡]/i.test(text) || /\b(el|la|los|que|por|para)\b/i.test(text)) return 'es';
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(text)) return 'ja';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

export async function translateWithMyMemory(
  text: string,
  from: string,
  to: string
): Promise<string> {
  const trimmed = text.trim().slice(0, 480);
  if (!trimmed) throw new Error('Texto vazio');

  const pair = `${LANG_MAP[from] || from}|${LANG_MAP[to] || to}`;
  let url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${encodeURIComponent(pair)}`;
  const email = process.env.MYMEMORY_EMAIL?.trim();
  if (email) url += `&de=${encodeURIComponent(email)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

  const data = (await res.json()) as {
    quotaFinished?: boolean;
    responseStatus?: number | string;
    responseDetails?: string;
    responseData?: { translatedText?: string };
  };

  if (data?.quotaFinished) throw new Error('quotaFinished');
  const status = data?.responseStatus;
  if (status && status !== 200 && status !== '200') {
    throw new Error(data?.responseDetails || `API status ${status}`);
  }

  const out = data?.responseData?.translatedText?.trim();
  if (!out || /MYMEMORY\s+WARNING|QUOTA\s+FINISHED/i.test(out)) {
    throw new Error('Tradução vazia ou cota esgotada');
  }
  return out;
}

export async function resolvePhraseTranslation(input: {
  fraseId: string;
  locale: string;
  sourceText: string;
  force?: boolean;
}): Promise<{ text: string; fromCache: boolean; localeOrigem: string }> {
  const { fraseId, locale, sourceText, force } = input;
  const trimmed = sourceText.trim();

  if (!fraseId || !trimmed || !isSeoLocale(locale)) {
    throw new Error('frase_id, locale e source_text são obrigatórios');
  }

  if (!force) {
    const cached = await lookupPhraseTranslation(fraseId, locale, trimmed);
    if (cached) {
      return {
        text: cached.texto,
        fromCache: true,
        localeOrigem: cached.locale_origem,
      };
    }
  }

  const localeOrigem = detectSourceLocale(trimmed);
  if (localeOrigem === locale) {
    return { text: trimmed, fromCache: true, localeOrigem };
  }

  const translated = await translateWithMyMemory(trimmed, localeOrigem, locale);
  await upsertPhraseTranslation({
    fraseId,
    locale,
    sourceText: trimmed,
    translatedText: translated,
    localeOrigem,
  });

  return { text: translated, fromCache: false, localeOrigem };
}
