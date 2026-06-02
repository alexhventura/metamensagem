/** Leitura de shards no servidor (Node) — não importar no cliente. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  findFraseInList,
  fraseDetailCacheHeaders,
  shardsToProbe,
  type FraseDetailRecord,
} from './detailLookup';

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

export function fraseDetailCacheHeaders(): Record<string, string> {
  return { 'Cache-Control': IMMUTABLE_CACHE };
}

export async function readFraseDetailFromShards(
  requested: string,
  cwd = process.cwd()
): Promise<FraseDetailRecord | null> {
  const key = requested.toLowerCase().trim();
  if (!key) return null;

  for (const shardId of shardsToProbe(key)) {
    try {
      const filePath = join(cwd, 'public', 'frases-v2', 'detail', `shard-${shardId}.json`);
      const raw = await readFile(filePath, 'utf8');
      const list = JSON.parse(raw) as FraseDetailRecord[];
      const found = findFraseInList(list, key);
      if (found) return found;
    } catch {
      /* próximo shard */
    }
  }
  return null;
}
