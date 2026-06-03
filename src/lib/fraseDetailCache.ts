/**
 * Cache persistente de detalhe de frases e shards CDN (IndexedDB).
 * Frases raramente mudam — reutiliza dados entre sessões (0 rede na revisit).
 */
import type { FraseDetailRecord } from '../../lib/frases/detailLookup';
import type { FraseDetailLoadResult } from './supabase/fraseLoader';

const DB_NAME = 'mm-frase-cache-v1';
const DB_VERSION = 1;
const STORE_FRASES = 'frases';
const STORE_SHARDS = 'shards';

const FRASE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SHARD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type FraseRow = { key: string; bundle: FraseDetailLoadResult; savedAt: number };
type ShardRow = { key: string; records: FraseDetailRecord[]; savedAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FRASES)) {
        db.createObjectStore(STORE_FRASES, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_SHARDS)) {
        db.createObjectStore(STORE_SHARDS, { keyPath: 'key' });
      }
    };
  });
}

function isFresh(savedAt: number, ttlMs: number): boolean {
  return Date.now() - savedAt < ttlMs;
}

export async function getCachedFraseDetail(slug: string): Promise<FraseDetailLoadResult | null> {
  const key = slug.toLowerCase().trim();
  if (!key || typeof indexedDB === 'undefined') return null;
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FRASES, 'readonly');
      const req = tx.objectStore(STORE_FRASES).get(key);
      req.onsuccess = () => {
        const row = req.result as FraseRow | undefined;
        if (!row?.bundle?.frase?.frase_original?.trim()) {
          resolve(null);
          return;
        }
        if (!isFresh(row.savedAt, FRASE_TTL_MS)) {
          resolve(null);
          return;
        }
        resolve(row.bundle);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function persistFraseDetail(slug: string, bundle: FraseDetailLoadResult): Promise<void> {
  const key = slug.toLowerCase().trim();
  if (!key || !bundle.frase?.frase_original?.trim() || typeof indexedDB === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FRASES, 'readwrite');
      tx.objectStore(STORE_FRASES).put({ key, bundle, savedAt: Date.now() } satisfies FraseRow);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* cache best-effort */
  }
}

export async function getCachedShard(shardId: string): Promise<FraseDetailRecord[] | null> {
  const key = shardId.trim();
  if (!key || typeof indexedDB === 'undefined') return null;
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SHARDS, 'readonly');
      const req = tx.objectStore(STORE_SHARDS).get(key);
      req.onsuccess = () => {
        const row = req.result as ShardRow | undefined;
        if (!row?.records?.length || !isFresh(row.savedAt, SHARD_TTL_MS)) {
          resolve(null);
          return;
        }
        resolve(row.records);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function persistShard(shardId: string, records: FraseDetailRecord[]): Promise<void> {
  const key = shardId.trim();
  if (!key || !records.length || typeof indexedDB === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SHARDS, 'readwrite');
      tx.objectStore(STORE_SHARDS).put({ key, records, savedAt: Date.now() } satisfies ShardRow);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* cache best-effort */
  }
}
