/**
 * Upsert em frase_search_index (service role) — hooks de tradução/import.
 *
 * Tradução via API: refreshFraseSearchIndexAfterTranslation (uma locale).
 * Import/reindex pontual: refreshFraseSearchIndexFull (original + traduções oficiais).
 * Backfill em massa: scripts/backfillFraseSearchIndex.mjs (--mode popular|combined; não full no free tier).
 */
import { getServerSupabaseServiceRole } from './_supabaseServer.js';
import {
  buildSearchIndexRow,
  buildSearchIndexRowsForPhrase,
} from '../lib/search/buildSearchIndexRow.mjs';

export type SearchIndexRow = {
  frase_id: string;
  language: string;
  search_text: string;
  keywords: string[];
};

export async function upsertFraseSearchIndexRows(rows: SearchIndexRow[]): Promise<boolean> {
  if (!rows.length) return true;
  const sb = getServerSupabaseServiceRole();
  if (!sb) return false;

  const payload = rows.map((r) => ({
    frase_id: r.frase_id,
    language: r.language,
    search_text: r.search_text,
    keywords: r.keywords,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await sb.from('frase_search_index').upsert(payload, {
    onConflict: 'frase_id,language',
  });

  if (error) {
    console.error('[frase-search-index] upsert', error.message);
    return false;
  }
  return true;
}

async function fetchPhraseMeta(fraseId: string): Promise<{
  autor?: string;
  categoria?: string;
  tags?: string[];
  palavrasChave?: string[];
  languageOriginal?: string;
  originalText?: string;
}> {
  const sb = getServerSupabaseServiceRole();
  if (!sb) return {};

  const [{ data: frase }, { data: indexRow }] = await Promise.all([
    sb
      .from('frases')
      .select('frase_original, autor_original, categoria, contextos, palavras_chave, language_original')
      .eq('id', fraseId)
      .maybeSingle(),
    sb.from('frases_index').select('titulo, categoria_id').eq('id', fraseId).maybeSingle(),
  ]);

  let categoriaSlug = frase?.categoria ? String(frase.categoria) : undefined;
  if (indexRow?.categoria_id != null) {
    const { data: cat } = await sb
      .from('categorias')
      .select('slug')
      .eq('id', indexRow.categoria_id)
      .maybeSingle();
    if (cat?.slug) categoriaSlug = String(cat.slug);
  }

  const tags = Array.isArray(frase?.contextos) ? frase.contextos.map(String) : [];

  return {
    autor: frase?.autor_original ? String(frase.autor_original) : undefined,
    categoria: categoriaSlug,
    tags,
    palavrasChave: Array.isArray(frase?.palavras_chave) ? frase.palavras_chave.map(String) : [],
    languageOriginal: frase?.language_original ? String(frase.language_original) : 'pt',
    originalText: frase?.frase_original
      ? String(frase.frase_original)
      : indexRow?.titulo
        ? String(indexRow.titulo)
        : undefined,
  };
}

/** Atualiza uma linha após tradução salva. */
export async function refreshFraseSearchIndexAfterTranslation(
  fraseId: string,
  locale: string,
  translatedText: string
): Promise<boolean> {
  const meta = await fetchPhraseMeta(fraseId);
  const row = buildSearchIndexRow({
    language: locale,
    text: translatedText,
    autor: meta.autor,
    categoria: meta.categoria,
    tags: meta.tags,
    palavrasChave: meta.palavrasChave,
  });
  return upsertFraseSearchIndexRows([
    { frase_id: fraseId, language: locale, ...row },
  ]);
}

/** Reindexa todas as línguas conhecidas de uma frase (import ou backfill incremental). */
export async function refreshFraseSearchIndexFull(fraseId: string): Promise<boolean> {
  const sb = getServerSupabaseServiceRole();
  if (!sb) return false;

  const meta = await fetchPhraseMeta(fraseId);
  if (!meta.originalText?.trim()) return false;

  const { data: translations } = await sb
    .from('frases_traducoes')
    .select('locale, texto')
    .eq('frase_id', fraseId)
    .eq('is_official', true);

  const rows = buildSearchIndexRowsForPhrase({
    fraseId,
    languageOriginal: meta.languageOriginal || 'pt',
    originalText: meta.originalText,
    autor: meta.autor,
    categoria: meta.categoria,
    tags: meta.tags,
    palavrasChave: meta.palavrasChave,
    translations: (translations || []).map((t) => ({
      locale: String(t.locale),
      texto: String(t.texto),
    })),
  });

  return upsertFraseSearchIndexRows(rows);
}
