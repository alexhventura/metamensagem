import {
  findFraseInList,
  normalizeFraseDetailRecord,
  pickBestSlugMatch,
  resolveCanonicalSlugFromIndex,
  shardsToProbe,
  type FraseDetailRecord,
} from '../lib/frases/detailLookup.js';
import { getServerSupabase } from './_supabaseServer.js';

const FRASE_SELECT =
  'id,slug,frase_original,autor_original,autor_slug,categoria,contextos,palavras_chave,explicacao,ano_ou_data,fontes,observacao,autor_tipo,nacionalidade,nascimento_falecimento,semantica,seo,informacoes';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_LEGACY_SHARD_PROBES = 2;

type IndexHit = { slug: string; shard: string | null };

function slugProbeKeys(key: string): string[] {
  const probes = new Set<string>([key]);
  for (const len of [64, 48, 40, 32, 24]) {
    if (key.length > len) probes.add(key.slice(0, len));
  }
  return [...probes];
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
    const text = await res.text();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error('invalid JSON');
    }
  } finally {
    clearTimeout(timer);
  }
}

function mapFraseRow(row: Record<string, unknown>): FraseDetailRecord | null {
  try {
    const sem = (row.semantica ?? {}) as {
      categoriaPrincipal?: string;
      contextos?: string[];
      palavrasChave?: string[];
    };
    return normalizeFraseDetailRecord({
      id: String(row.id ?? ''),
      slug: String(row.slug ?? ''),
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
  } catch (err) {
    console.error('[frase-detail:mapFraseRow]', err);
    return null;
  }
}

async function loadFraseFromSupabaseTable(slug: string): Promise<FraseDetailRecord | null> {
  const sb = getServerSupabase();
  if (!sb) return null;

  const key = slug.toLowerCase().trim();
  const candidates: Record<string, unknown>[] = [];

  try {
    const { data: exact, error: exactErr } = await sb
      .from('frases')
      .select(FRASE_SELECT)
      .eq('slug', key)
      .maybeSingle();

    if (!exactErr && exact) {
      const mapped = mapFraseRow(exact as Record<string, unknown>);
      if (mapped) return mapped;
    }

    for (const probe of slugProbeKeys(key)) {
      const { data: prefixRows, error: prefixErr } = await sb
        .from('frases')
        .select(FRASE_SELECT)
        .like('slug', `${probe}%`)
        .limit(12);

      if (prefixErr || !prefixRows?.length) continue;
      for (const row of prefixRows) {
        const slugValue = String((row as Record<string, unknown>).slug ?? '');
        if (!slugValue || candidates.some((c) => String(c.slug) === slugValue)) continue;
        candidates.push(row as Record<string, unknown>);
      }
    }

    const hit = pickBestSlugMatch(
      candidates.map((row) => ({ slug: String(row.slug ?? '') })),
      key
    );
    if (hit) {
      const row = candidates.find((r) => String(r.slug).toLowerCase() === hit.slug.toLowerCase());
      if (row) return mapFraseRow(row);
    }
  } catch (err) {
    console.error('[frase-detail:supabase-table]', key, err);
  }

  return null;
}

async function resolveIndexHit(slug: string): Promise<IndexHit | null> {
  const sb = getServerSupabase();
  if (!sb) return null;

  const key = slug.toLowerCase().trim();
  const rows: IndexHit[] = [];

  try {
    const { data: exact } = await sb
      .from('frases_index')
      .select('slug,shard')
      .eq('slug', key)
      .maybeSingle();

    if (exact?.slug) return exact as IndexHit;

    for (const probe of slugProbeKeys(key)) {
      const { data: prefixRows } = await sb
        .from('frases_index')
        .select('slug,shard')
        .like('slug', `${probe}%`)
        .order('slug', { ascending: true })
        .limit(16);

      for (const row of prefixRows ?? []) {
        const slugValue = String(row.slug ?? '').toLowerCase();
        if (!slugValue || rows.some((r) => r.slug.toLowerCase() === slugValue)) continue;
        rows.push(row as IndexHit);
      }
    }

    return pickBestSlugMatch(rows, key);
  } catch (err) {
    console.error('[frase-detail:frases_index]', key, err);
    return null;
  }
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

/** Resolve detalhe da frase por slug (Supabase → shard único → fallback legado). */
export async function resolveFraseDetailBySlug(
  slug: string,
  assetBase: string
): Promise<FraseDetailRecord | null> {
  const key = slug.toLowerCase().trim();
  if (!key) return null;

  try {
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

    const fetchJson = async (path: string) =>
      fetchJsonWithTimeout(`${assetBase.replace(/\/$/, '')}${path}`);

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
  } catch (err) {
    console.error('[frase-detail:resolve]', { slug: key, err });
    return null;
  }
}
