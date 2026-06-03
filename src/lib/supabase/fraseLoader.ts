/**
 * Leitura de frases via Supabase (cliente anônimo + RLS).
 * Substitui API / shards no detalhe da frase.
 *
 * InfoSec (browser):
 * - Credenciais via getSupabase() → publicEnv (somente VITE_SUPABASE_*).
 * - Nunca importar process.env nem DATABASE_URL / SERVICE_ROLE neste módulo.
 * - Queries com colunas explícitas (sem SELECT *) para reduzir egress.
 *
 * Variáveis (resolvidas em ../publicEnv.ts): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
 */

import type { FraseSeoPack, FraseSemantica } from '../../../lib/enrichment/types';
import {
  findFraseInList,
  normalizeFraseDetailRecord,
  type FraseDetailRecord,
} from '../../../lib/frases/detailLookup';
import type { SeoLocale } from '../../../lib/i18n/locales';
import { seoLocaleFromLanguageOriginal } from '../../../lib/i18n/locales';
import { resolveFraseContentLocale } from '../i18nRoutes';
import type { CardContentDisplay } from '../translation/types';
import type { FraseCms } from '../frasesModel';
import { getSupabase, isSupabaseConfigured } from '../supabaseClient';

const FRASE_DETAIL_SELECT =
  'id,slug,frase_original,autor_original,autor_slug,categoria,contextos,palavras_chave,explicacao,ano_ou_data,fontes,observacao,autor_tipo,nacionalidade,nascimento_falecimento,language_original,popularidade,shard,semantica,seo,informacoes';

const SLUG_DETAIL_CACHE_MAX = 200;
const SLUG_DETAIL_CACHE_TTL_MS = 90_000;

type SlugCacheEntry = {
  result: FraseDetailLoadResult | null;
  expiresAt: number;
};

const slugDetailCache = new Map<string, SlugCacheEntry>();

function slugCacheKey(slug: string, prefixLocale?: SeoLocale | null): string {
  return `${slug.toLowerCase()}|${prefixLocale ?? ''}`;
}

function getSlugCacheEntry(key: string): FraseDetailLoadResult | null | undefined {
  const entry = slugDetailCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    slugDetailCache.delete(key);
    return undefined;
  }
  return entry.result;
}

function setSlugCacheEntry(key: string, result: FraseDetailLoadResult | null): void {
  if (slugDetailCache.size >= SLUG_DETAIL_CACHE_MAX) {
    const oldest = slugDetailCache.keys().next().value;
    if (oldest) slugDetailCache.delete(oldest);
  }
  slugDetailCache.set(key, { result, expiresAt: Date.now() + SLUG_DETAIL_CACHE_TTL_MS });
}

export type LoadFraseDetailOptions = {
  /** Prefixo da URL (/en/frases/...) — define locale de conteúdo. */
  prefixLocale?: SeoLocale | null;
};

export type FraseDetailLoadResult = {
  frase: FraseCms;
  display: CardContentDisplay;
};

type FraseRow = {
  id: string;
  slug: string;
  frase_original: string;
  autor_original: string;
  autor_slug?: string | null;
  categoria: string;
  contextos: string[] | null;
  palavras_chave: string[] | null;
  explicacao: string | null;
  ano_ou_data: string | null;
  fontes: string | null;
  observacao: string | null;
  autor_tipo: string | null;
  nacionalidade: string | null;
  nascimento_falecimento: string | null;
  language_original: string;
  popularidade?: number | null;
  shard?: string | null;
  semantica?: Record<string, unknown> | null;
  seo?: Record<string, unknown> | null;
  informacoes?: Record<string, unknown> | null;
};

type TraducaoRow = {
  texto: string;
  explicacao: string | null;
  source_hash: string;
  locale: string;
};

/** Mesmo algoritmo de persistentStore — invalida cache se o original mudar. */
export function hashPhraseSourceText(text: string): string {
  let h = 0;
  const s = text.trim();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function mergeSemantica(row: FraseRow): FraseSemantica | undefined {
  const raw = (row.semantica ?? {}) as FraseSemantica;
  const lang = row.language_original || raw.idiomaOriginal || raw.languageOriginal;
  if (!lang && !Object.keys(raw).length) return undefined;
  return {
    ...raw,
    idiomaOriginal: raw.idiomaOriginal ?? lang,
    languageOriginal: raw.languageOriginal ?? lang,
  };
}

function rowToFraseCms(row: FraseRow): FraseCms {
  const semantica = mergeSemantica(row);
  const informacoes = row.informacoes ?? undefined;
  const seo = (row.seo ?? undefined) as FraseSeoPack | undefined;

  const record: FraseDetailRecord = {
    id: row.id,
    slug: row.slug.toLowerCase(),
    frase_original: row.frase_original,
    autor_original: row.autor_original || 'Anônimo',
    autor_slug: row.autor_slug ?? undefined,
    categoria: row.categoria || 'reflexao',
    contextos: row.contextos ?? [],
    palavras_chave: row.palavras_chave ?? [],
    explicacao: row.explicacao ?? '',
    ano_ou_data: row.ano_ou_data,
    fontes: row.fontes,
    observacao: row.observacao,
    autor_tipo: row.autor_tipo,
    nacionalidade: row.nacionalidade,
    nascimento_falecimento: row.nascimento_falecimento,
    informacoes,
  };

  const normalized = normalizeFraseDetailRecord(record) as FraseCms;
  normalized.semantica = semantica;
  normalized.seo = seo;
  return normalized;
}

async function fetchFraseRowsBySlug(slug: string): Promise<FraseRow[]> {
  const supabase = getSupabase();
  const key = slug.toLowerCase().trim();

  const { data: exact, error: exactErr } = await supabase
    .from('frases')
    .select(FRASE_DETAIL_SELECT)
    .eq('slug', key)
    .maybeSingle();

  if (exactErr) {
    if (import.meta.env.DEV) {
      console.warn('[supabase/fraseLoader] falha ao buscar slug (detalhe omitido)');
    }
  } else if (exact) {
    return [exact as FraseRow];
  }

  const { data: prefixRows, error: prefixErr } = await supabase
    .from('frases')
    .select(FRASE_DETAIL_SELECT)
    .like('slug', `${key}%`)
    .limit(12);

  if (prefixErr) {
    if (import.meta.env.DEV) {
      console.warn('[supabase/fraseLoader] falha no prefixo de slug (detalhe omitido)');
    }
    return [];
  }

  const rows = (prefixRows ?? []) as FraseRow[];
  if (rows.length) return rows;

  if (key.length >= 20) {
    const { data: fuzzyRows } = await supabase
      .from('frases')
      .select(FRASE_DETAIL_SELECT)
      .like('slug', `${key.slice(0, 24)}%`)
      .limit(12);
    return (fuzzyRows ?? []) as FraseRow[];
  }

  return [];
}

type IndexHit = { slug: string; shard: string | null; titulo: string };

function matchIndexHit(rows: IndexHit[], key: string): IndexHit | null {
  if (!rows.length) return null;
  const exact = rows.find((r) => r.slug.toLowerCase() === key);
  if (exact) return exact;
  return (
    rows.find(
      (r) =>
        r.slug.toLowerCase().startsWith(key) || key.startsWith(r.slug.toLowerCase())
    ) ?? null
  );
}

async function fetchIndexHitBySlug(slug: string): Promise<IndexHit | null> {
  const supabase = getSupabase();
  const key = slug.toLowerCase().trim();
  if (!key) return null;

  const { data: exact } = await supabase
    .from('frases_index')
    .select('slug,shard,titulo')
    .eq('slug', key)
    .maybeSingle();

  if (exact?.slug) return exact as IndexHit;

  const { data: prefixRows } = await supabase
    .from('frases_index')
    .select('slug,shard,titulo')
    .like('slug', `${key}%`)
    .order('slug', { ascending: true })
    .limit(12);

  const prefixHit = matchIndexHit((prefixRows ?? []) as IndexHit[], key);
  if (prefixHit) return prefixHit;

  if (key.length >= 24) {
    const { data: fuzzyRows } = await supabase
      .from('frases_index')
      .select('slug,shard,titulo')
      .like('slug', `${key.slice(0, 24)}%`)
      .limit(16);

    return matchIndexHit((fuzzyRows ?? []) as IndexHit[], key);
  }

  return null;
}

/** Detalhe completo via /api (shard CDN + índice no servidor). */
async function loadFraseDetailFromApi(slug: string): Promise<FraseDetailLoadResult | null> {
  const key = slug.toLowerCase().trim();
  if (!key) return null;

  try {
    const res = await fetch(`/api/frase-detail?slug=${encodeURIComponent(key)}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;

    const data = (await res.json()) as FraseDetailRecord & { found?: boolean };
    if (data.found === false) return null;

    const frase = normalizeFraseDetailRecord(data) as FraseCms;
    if (!frase.frase_original?.trim()) return null;

    return {
      frase,
      display: {
        texto: frase.frase_original,
        autor: frase.autor_original,
        explicacao: frase.explicacao || undefined,
        isTranslated: false,
      },
    };
  } catch {
    return null;
  }
}

async function fetchFraseRowById(id: string): Promise<FraseRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('frases')
    .select(FRASE_DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[supabase/fraseLoader] falha ao buscar por id (detalhe omitido)');
    }
    return null;
  }
  return (data as FraseRow) ?? null;
}

async function fetchCachedTranslation(
  fraseId: string,
  locale: SeoLocale,
  sourceText: string
): Promise<TraducaoRow | null> {
  const supabase = getSupabase();
  const expectedHash = hashPhraseSourceText(sourceText);

  const { data, error } = await supabase
    .from('frases_traducoes')
    .select('texto, explicacao, source_hash, locale')
    .eq('frase_id', fraseId)
    .eq('locale', locale)
    .eq('is_official', true)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as TraducaoRow;
  if (row.source_hash !== expectedHash) return null;
  return row;
}

function resolveFraseFromRows(rows: FraseRow[], requestedSlug: string): FraseCms | null {
  if (!rows.length) return null;
  const list = rows.map((r) => rowToFraseCms(r));
  return findFraseInList(list, requestedSlug) as FraseCms | null;
}

function buildDisplay(
  frase: FraseCms,
  contentLocale: SeoLocale,
  defaultLocale: SeoLocale,
  cached: TraducaoRow | null
): CardContentDisplay {
  const base: CardContentDisplay = {
    texto: frase.frase_original,
    autor: frase.autor_original,
    explicacao: frase.explicacao || undefined,
    isTranslated: false,
  };

  if (contentLocale === defaultLocale) return base;

  if (cached?.texto) {
    return {
      texto: cached.texto,
      autor: frase.autor_original,
      explicacao: cached.explicacao ?? frase.explicacao ?? undefined,
      isTranslated: true,
      targetLang: contentLocale,
    };
  }

  return base;
}

export async function loadFraseDetailFromSupabase(
  slug: string,
  options?: LoadFraseDetailOptions
): Promise<FraseDetailLoadResult | null> {
  if (!isSupabaseConfigured()) return null;

  const key = slug.toLowerCase().trim();
  if (!key) return null;

  const cacheKey = slugCacheKey(key, options?.prefixLocale ?? null);
  const cached = getSlugCacheEntry(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const rows = await fetchFraseRowsBySlug(key);
    let frase = resolveFraseFromRows(rows, key);

    if (!frase) {
      const indexHit = await fetchIndexHitBySlug(key);
      const canonical = indexHit?.slug.toLowerCase() ?? key;

      if (indexHit && canonical !== key) {
        const canonicalRows = await fetchFraseRowsBySlug(canonical);
        frase = resolveFraseFromRows(canonicalRows, canonical);
      }

      if (!frase) {
        const fromApi = await loadFraseDetailFromApi(canonical);
        if (fromApi) {
          setSlugCacheEntry(cacheKey, fromApi);
          return fromApi;
        }
        if (canonical !== key) {
          const fromApiOriginal = await loadFraseDetailFromApi(key);
          if (fromApiOriginal) {
            setSlugCacheEntry(cacheKey, fromApiOriginal);
            return fromApiOriginal;
          }
        }
        setSlugCacheEntry(cacheKey, null);
        return null;
      }
    }

    const defaultLocale = seoLocaleFromLanguageOriginal(
      frase.semantica?.languageOriginal ||
        frase.semantica?.idiomaOriginal ||
        'pt'
    );
    const contentLocale = resolveFraseContentLocale(options?.prefixLocale ?? null, defaultLocale);

    let traducao: TraducaoRow | null = null;
    if (contentLocale !== defaultLocale) {
      traducao = await fetchCachedTranslation(frase.id, contentLocale, frase.frase_original);
    }

    const result: FraseDetailLoadResult = {
      frase,
      display: buildDisplay(frase, contentLocale, defaultLocale, traducao),
    };
    setSlugCacheEntry(cacheKey, result);
    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[supabase/fraseLoader] loadFraseDetailFromSupabase', err);
    }
    return null;
  }
}

export async function loadFraseDetailFromSupabaseById(
  phraseId: string,
  options?: LoadFraseDetailOptions
): Promise<FraseDetailLoadResult | null> {
  if (!isSupabaseConfigured()) return null;

  const id = phraseId.trim();
  if (!id) return null;

  try {
    const row = await fetchFraseRowById(id);
    if (!row) return loadFraseDetailFromSupabase(id, options);

    const frase = rowToFraseCms(row);
    const defaultLocale = seoLocaleFromLanguageOriginal(
      frase.semantica?.languageOriginal || frase.semantica?.idiomaOriginal || 'pt'
    );
    const contentLocale = resolveFraseContentLocale(options?.prefixLocale ?? null, defaultLocale);

    let cached: TraducaoRow | null = null;
    if (contentLocale !== defaultLocale) {
      cached = await fetchCachedTranslation(frase.id, contentLocale, frase.frase_original);
    }

    return {
      frase,
      display: buildDisplay(frase, contentLocale, defaultLocale, cached),
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[supabase/fraseLoader] loadFraseDetailFromSupabaseById', err);
    }
    return null;
  }
}
