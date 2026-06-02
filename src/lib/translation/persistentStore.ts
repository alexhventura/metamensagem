/**
 * Cache permanente de traduções de frases (IndexedDB + shards estáticos + fila para CI).
 */

import { shardForSlug } from '../../../lib/utils/shardForSlug';
import { SOURCE_CONTENT_LOCALE } from '../../../lib/i18n/platform';
import type { SeoLocale } from '../../../lib/i18n/locales';

const DB_NAME = 'mm-phrase-translations-v1';
const DB_STORE = 'phrases';
const QUEUE_KEY = 'mm-translation-queue-v1';
const MEM = new Map<string, PhraseTranslationEntry>();

export type PhraseTranslationEntry = {
  slug: string;
  locale: SeoLocale;
  text: string;
  from: SeoLocale;
  sourceHash: string;
  at: number;
};

export type TranslationShardFile = Record<
  string,
  Partial<Record<SeoLocale, { text: string; from?: SeoLocale; at?: number }>>
>;

function storageKey(slug: string, locale: SeoLocale): string {
  return `${slug.toLowerCase()}::${locale}`;
}

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'key' });
      }
    };
  });
}

async function idbGet(key: string): Promise<PhraseTranslationEntry | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const row = req.result as { key: string; entry: PhraseTranslationEntry } | undefined;
        resolve(row?.entry ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbPut(key: string, entry: PhraseTranslationEntry): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put({ key, entry });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* quota */
  }
}

const shardLoadPromises = new Map<string, Promise<TranslationShardFile>>();

async function loadTranslationShard(shard: string): Promise<TranslationShardFile> {
  const cached = shardLoadPromises.get(shard);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const res = await fetch(`/frases-v2/translations/shard-${shard}.json`);
      if (!res.ok) return {};
      return (await res.json()) as TranslationShardFile;
    } catch {
      return {};
    }
  })();

  shardLoadPromises.set(shard, promise);
  return promise;
}

function entryFromShard(
  slug: string,
  locale: SeoLocale,
  shard: TranslationShardFile,
  sourceText: string
): PhraseTranslationEntry | null {
  const row = shard[slug.toLowerCase()]?.[locale];
  if (!row?.text?.trim()) return null;
  return {
    slug: slug.toLowerCase(),
    locale,
    text: row.text.trim(),
    from: row.from ?? SOURCE_CONTENT_LOCALE,
    sourceHash: hashText(sourceText),
    at: row.at ?? 0,
  };
}

function enqueueForBuild(entry: PhraseTranslationEntry, sourceText: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue = raw ? (JSON.parse(raw) as PhraseTranslationEntry[]) : [];
    const next = queue.filter(
      (q) => !(q.slug === entry.slug && q.locale === entry.locale)
    );
    next.push({ ...entry, sourceHash: hashText(sourceText) });
    if (next.length > 2000) next.splice(0, next.length - 2000);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

/** Lê tradução persistida (não gera). */
export async function getPersistedPhraseTranslation(
  slug: string,
  locale: SeoLocale,
  sourceText: string
): Promise<PhraseTranslationEntry | null> {
  if (locale === SOURCE_CONTENT_LOCALE) return null;

  const key = storageKey(slug, locale);
  const mem = MEM.get(key);
  if (mem && mem.sourceHash === hashText(sourceText)) return mem;

  const idb = await idbGet(key);
  if (idb && idb.sourceHash === hashText(sourceText)) {
    MEM.set(key, idb);
    return idb;
  }

  const shard = await loadTranslationShard(shardForSlug(slug));
  const fromShard = entryFromShard(slug, locale, shard, sourceText);
  if (fromShard && fromShard.sourceHash === hashText(sourceText)) {
    MEM.set(key, fromShard);
    void idbPut(key, fromShard);
    return fromShard;
  }

  return null;
}

/** Grava tradução após validação (IndexedDB + fila para shards estáticos). */
export async function persistPhraseTranslation(
  slug: string,
  locale: SeoLocale,
  sourceText: string,
  translatedText: string,
  from: SeoLocale = SOURCE_CONTENT_LOCALE
): Promise<void> {
  if (locale === SOURCE_CONTENT_LOCALE || !translatedText.trim()) return;

  const entry: PhraseTranslationEntry = {
    slug: slug.toLowerCase(),
    locale,
    text: translatedText.trim(),
    from,
    sourceHash: hashText(sourceText),
    at: Date.now(),
  };

  const key = storageKey(slug, locale);
  MEM.set(key, entry);
  await idbPut(key, entry);
  enqueueForBuild(entry, sourceText);
}

export function readTranslationQueue(): PhraseTranslationEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PhraseTranslationEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearTranslationQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* ignore */
  }
}
