/** Carrega e cacheia shards de índice leve (467k frases) servidos pelo CDN. */

export type StaticIndexRow = {
  id: string;
  slug: string;
  autorSlug?: string;
  categoriaPrincipal?: string;
  shard?: string;
};

export type FeedSampleRow = {
  id: string;
  slug?: string;
  texto: string;
  autor: string;
  tags?: string[];
  tipo?: string;
};

type FrasesManifest = {
  version?: number;
  totalFrases?: number;
  shards: string[];
};

let manifestPromise: Promise<FrasesManifest> | null = null;
const shardCache = new Map<string, StaticIndexRow[]>();
let feedSamplePromise: Promise<FeedSampleRow[]> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function shardIdFromPath(shardPath: string): string {
  const base = shardPath.split('/').pop() || shardPath;
  return base.replace(/^shard-/, '').replace(/\.json$/, '');
}

export async function getFrasesManifest(): Promise<FrasesManifest> {
  if (!manifestPromise) {
    manifestPromise = fetchJson<FrasesManifest>('/frases-v2/manifest.json').catch((err) => {
      manifestPromise = null;
      throw err;
    });
  }
  return manifestPromise;
}

export async function listShardIds(): Promise<string[]> {
  const manifest = await getFrasesManifest();
  return manifest.shards.map(shardIdFromPath);
}

export async function loadIndexShard(shardId: string): Promise<StaticIndexRow[]> {
  const key = shardId.toLowerCase();
  const cached = shardCache.get(key);
  if (cached) return cached;

  const rows = await fetchJson<StaticIndexRow[]>(`/frases-v2/index/shard-${key}.json`);
  shardCache.set(key, rows);
  return rows;
}

export async function loadFeedSample(): Promise<FeedSampleRow[]> {
  if (!feedSamplePromise) {
    feedSamplePromise = fetchJson<FeedSampleRow[]>('/frases-v2/feed-sample.json').catch((err) => {
      feedSamplePromise = null;
      throw err;
    });
  }
  return feedSamplePromise;
}

/** Itera todos os shards em ordem estável (00 → ff). */
export async function forEachIndexShard(
  fn: (rows: StaticIndexRow[], shardId: string) => void | Promise<void>
): Promise<void> {
  const shardIds = await listShardIds();
  for (const shardId of shardIds) {
    const rows = await loadIndexShard(shardId);
    await fn(rows, shardId);
  }
}
