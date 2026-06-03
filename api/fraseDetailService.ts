import {
  findFraseInList,
  normalizeFraseDetailRecord,
  resolveCanonicalSlugFromIndex,
  shardsToProbe,
  type FraseDetailRecord,
} from '../lib/frases/detailLookup.js';
import { readFraseDetailFromShards } from '../lib/frases/detailLookupServer.js';
import { getServerSupabase } from './_supabaseServer.js';

const FRASE_SELECT =
  'id,slug,frase_original,autor_original,autor_slug,categoria,contextos,palavras_chave,explicacao,ano_ou_data,fontes,observacao,autor_tipo,nacionalidade,nascimento_falecimento,semantica,seo,informacoes';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_LEGACY_SHARD_PROBES = 2;

type IndexHit = { slug: string; shard: string | null };

function matchIndexSlug(rows: IndexHit[], key: string): IndexHit | null {
  if (!rows.length) return null;
  const exact = rows.find((r) => r.slug.toLowerCase() === key);
  if (exact) return exact;

  const prefix = rows.find(
    (r) =>
      r.slug.toLowerCase().startsWith(key) || key.startsWith(r.slug.toLowerCase())
  );
  return prefix ?? null;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function mapFraseRow(row: Record<string, unknown>): FraseDetailRecord {
  const sem = (row.semantica ?? {}) as { categoriaPrincipal?: string; contextos?: string[]; palavrasChave?: string[] };
  return normalizeFraseDetailRecord({
    id: String(row.id),
    slug: String(row.slug),
    frase_original: String(row.frase_original ?? ''),
    autor_original: String(row.autor_original ?? 'Anônimo'),
    autor_slug: row.autor_slug ? String(row.autor_slug) : undefined,
    categoria: String(row.categoria ?? sem.categoriaPrincipal ?? 'reflexao'),
    contextos: (row.contextos as string[] | null) ?? sem.contextos ?? [],
    palavras_chave: (row.palavras_chave as string[] | null) ?? sem.palavrasChave ?? [],
    explicacao: String(row.explicacao ?? ''),
    ano_ou_data: (row.ano_ou_data as string | null) ?? null,
    fontes: (row.fontes as string | null) ?? null,
    observacao: (row.observacao as string | null) ?? null,
    autor_tipo: (row.autor_tipo as string | null) ?? null,
    nacionalidade: (row.nacionalidade as string | null) ?? null,
    nascimento_falecimento: (row.nascimento_falecimento as string | null) ?? null,
    informacoes: row.informacoes as FraseDetailRecord['informacoes'],
    semantica: row.semantica as Record<string, unknown> | undefined,
    seo: row.seo as Record<string, unknown> | undefined,
  });
}

async function loadFraseFromSupabaseTable(slug: string): Promise<FraseDetailRecord | null> {
  const sb = getServerSupabase();
  if (!sb) return null;

  const key = slug.toLowerCase().trim();

  const { data: exact, error: exactErr } = await sb
    .from('frases')
    .select(FRASE_SELECT)
    .eq('slug', key)
    .maybeSingle();

  if (!exactErr && exact) return mapFraseRow(exact as Record<string, unknown>);

  const { data: prefixRows, error: prefixErr } = await sb
    .from('frases')
    .select(FRASE_SELECT)
    .like('slug', `${key}%`)
    .limit(8);

  if (prefixErr || !prefixRows?.length) return null;

  const hit = prefixRows.find((r) => String(r.slug).toLowerCase().startsWith(key));
  if (hit) return mapFraseRow(hit as Record<string, unknown>);

  const reverse = prefixRows.find((r) => key.startsWith(String(r.slug).toLowerCase()));
  return reverse ? mapFraseRow(reverse as Record<string, unknown>) : null;
}

async function resolveIndexHit(slug: string): Promise<IndexHit | null> {
  const sb = getServerSupabase();
  if (!sb) return null;

  const key = slug.toLowerCase().trim();

  const { data: exact } = await sb
    .from('frases_index')
    .select('slug,shard')
    .eq('slug', key)
    .maybeSingle();

  if (exact?.slug) return exact as IndexHit;

  const { data: prefixRows } = await sb
    .from('frases_index')
    .select('slug,shard')
    .like('slug', `${key}%`)
    .order('slug', { ascending: true })
    .limit(12);

  const prefixHit = matchIndexSlug((prefixRows ?? []) as IndexHit[], key);
  if (prefixHit) return prefixHit;

  if (key.length >= 24) {
    const { data: fuzzyRows } = await sb
      .from('frases_index')
      .select('slug,shard')
      .like('slug', `${key.slice(0, 24)}%`)
      .limit(16);

    return matchIndexSlug((fuzzyRows ?? []) as IndexHit[], key);
  }

  return null;
}

async function loadFraseFromDetailShard(
  slug: string,
  shardId: string,
  assetBase: string
): Promise<FraseDetailRecord | null> {
  const base = assetBase.replace(/\/$/, '');
  try {
    const list = (await fetchJsonWithTimeout(
      `${base}/frases-v2/detail/shard-${shardId}.json`
    )) as FraseDetailRecord[];
    if (!Array.isArray(list)) return null;
    return findFraseInList(list, slug);
  } catch {
    return null;
  }
}

async function loadFraseFromLegacyShards(
  slug: string,
  assetBase: string,
  preferredShard?: string | null
): Promise<FraseDetailRecord | null> {
  const probeIds = [...new Set([...(preferredShard ? [preferredShard] : []), ...shardsToProbe(slug)])].slice(
    0,
    MAX_LEGACY_SHARD_PROBES + (preferredShard ? 1 : 0)
  );

  for (const shardId of probeIds) {
    const hit = await loadFraseFromDetailShard(slug, shardId, assetBase);
    if (hit) return hit;
  }
  return null;
}

async function loadFraseFromFilesystem(slug: string): Promise<FraseDetailRecord | null> {
  try {
    return await readFraseDetailFromShards(slug);
  } catch {
    return null;
  }
}

/** Resolve detalhe da frase por slug (Supabase → shard único → fallback legado). */
export async function resolveFraseDetailBySlug(
  slug: string,
  assetBase: string
): Promise<FraseDetailRecord | null> {
  const key = slug.toLowerCase().trim();
  if (!key) return null;

  const fromTable = await loadFraseFromSupabaseTable(key);
  if (fromTable) return fromTable;

  const indexHit = await resolveIndexHit(key);
  const canonicalSlug = indexHit?.slug.toLowerCase() ?? key;

  if (indexHit && canonicalSlug !== key) {
    const fromCanonical = await loadFraseFromSupabaseTable(canonicalSlug);
    if (fromCanonical) return fromCanonical;
  }

  if (indexHit?.shard) {
    const fromShard = await loadFraseFromDetailShard(canonicalSlug, indexHit.shard, assetBase);
    if (fromShard) return fromShard;
  }

  const fromFs = await loadFraseFromFilesystem(canonicalSlug);
  if (fromFs) return fromFs;

  const fetchJson = async (path: string) => fetchJsonWithTimeout(`${assetBase.replace(/\/$/, '')}${path}`);

  const resolved =
    (await resolveCanonicalSlugFromIndex(canonicalSlug, fetchJson)) ?? canonicalSlug;

  const fromLegacy = await loadFraseFromLegacyShards(
    resolved,
    assetBase,
    indexHit?.shard ?? null
  );
  if (fromLegacy) return fromLegacy;

  if (resolved !== key) {
    return loadFraseFromLegacyShards(key, assetBase, indexHit?.shard ?? null);
  }

  return null;
}
