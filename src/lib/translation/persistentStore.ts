/**
 * Cache permanente de traduções de frases (IndexedDB + CDN + Supabase + fila CI).
 * Chave canônica: frase_id + locale (slug só como fallback legado).
 */

import { hashPhraseSourceText } from '../../../lib/translation/sourceHash';
import { shardForSlug } from '../../../lib/utils/shardForSlug';
import { SOURCE_CONTENT_LOCALE } from '../../../lib/i18n/platform';
import type { SeoLocale } from '../../../lib/i18n/locales';
import { getSupabase, isSupabaseConfigured } from '../supabaseClient';

const DB_NAME = 'mm-phrase-translations-v2';
const DB_STORE = 'phrases';
const QUEUE_KEY = 'mm-translation-queue-v1';
const MEM = new Map<string, PhraseTranslationEntry>();

export type PhraseTranslationEntry = {
  fraseId?: string;
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

function storageKey(fraseId: string | undefined, slug: string, locale: SeoLocale): string {
  const id = fraseId?.trim();
  if (id) return `id:${id}::${locale}`;
  return `slug:${slug.toLowerCase()}::${locale}`;
}

function legacyStorageKey(slug: string, locale: SeoLocale): string {
  return `${slug.toLowerCase()}::${locale}`;
}

function hashText(text: string): string {
  return hashPhraseSourceText(text);
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
      const req = tx.objectStore(DB_STORE).get(key);
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
  sourceText: string,
  fraseId?: string
): PhraseTranslationEntry | null {
  const row = shard[slug.toLowerCase()]?.[locale];
  if (!row?.text?.trim()) return null;
  return {
    fraseId,
    slug: slug.toLowerCase(),
    locale,
    text: row.text.trim(),
    from: row.from ?? SOURCE_CONTENT_LOCALE,
    sourceHash: hashText(sourceText),
    at: row.at ?? 0,
  };
}

async function fetchSupabaseTranslation(
  fraseId: string,
  locale: SeoLocale,
  sourceText: string,
  slug: string
): Promise<PhraseTranslationEntry | null> {
  if (!isSupabaseConfigured() || locale === SOURCE_CONTENT_LOCALE) return null;

  try {
    const expectedHash = hashText(sourceText);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('frases_traducoes')
      .select('texto, locale_origem, source_hash')
      .eq('frase_id', fraseId)
      .eq('locale', locale)
      .eq('is_official', true)
      .maybeSingle();

    if (error || !data?.texto?.trim()) return null;
    if (String(data.source_hash) !== expectedHash) return null;

    return {
      fraseId,
      slug: slug.toLowerCase(),
      locale,
      text: String(data.texto).trim(),
      from: (String(data.locale_origem || SOURCE_CONTENT_LOCALE) as SeoLocale) || SOURCE_CONTENT_LOCALE,
      sourceHash: expectedHash,
      at: Date.now(),
    };
  } catch {
    return null;
  }
}

function enqueueForBuild(entry: PhraseTranslationEntry, sourceText: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue = raw ? (JSON.parse(raw) as PhraseTranslationEntry[]) : [];
    const next = queue.filter(
      (q) =>
        !(
          q.locale === entry.locale &&
          ((entry.fraseId && q.fraseId === entry.fraseId) ||
            q.slug === entry.slug)
        )
    );
    next.push({ ...entry, sourceHash: hashText(sourceText) });
    if (next.length > 2000) next.splice(0, next.length - 2000);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

function isValidEntry(entry: PhraseTranslationEntry, sourceText: string): boolean {
  return !!entry.text?.trim() && entry.sourceHash === hashText(sourceText);
}

async function readLocalEntry(
  key: string,
  legacyKey: string | null,
  sourceText: string
): Promise<PhraseTranslationEntry | null> {
  const mem = MEM.get(key) ?? (legacyKey ? MEM.get(legacyKey) : undefined);
  if (mem && isValidEntry(mem, sourceText)) return mem;

  const idb = (await idbGet(key)) ?? (legacyKey ? await idbGet(legacyKey) : null);
  if (idb && isValidEntry(idb, sourceText)) {
    MEM.set(key, idb);
    return idb;
  }

  return null;
}

/** Lê tradução persistida (não gera). Ordem: mem → IDB → CDN → Supabase. */
export async function getPersistedPhraseTranslation(
  slug: string,
  locale: SeoLocale,
  sourceText: string,
  fraseId?: string
): Promise<PhraseTranslationEntry | null> {
  if (locale === SOURCE_CONTENT_LOCALE) return null;

  const key = storageKey(fraseId, slug, locale);
  const legacyKey = fraseId ? legacyStorageKey(slug, locale) : null;

  const local = await readLocalEntry(key, legacyKey, sourceText);
  if (local) return local;

  const shard = await loadTranslationShard(shardForSlug(slug));
  const fromShard = entryFromShard(slug, locale, shard, sourceText, fraseId);
  if (fromShard && isValidEntry(fromShard, sourceText)) {
    MEM.set(key, fromShard);
    void idbPut(key, fromShard);
    return fromShard;
  }

  if (fraseId?.trim()) {
    const fromSupabase = await fetchSupabaseTranslation(fraseId, locale, sourceText, slug);
    if (fromSupabase && isValidEntry(fromSupabase, sourceText)) {
      MEM.set(key, fromSupabase);
      void idbPut(key, fromSupabase);
      return fromSupabase;
    }
  }

  return null;
}

/** Grava tradução após validação (IndexedDB + fila para shards estáticos). */
export async function persistPhraseTranslation(
  slug: string,
  locale: SeoLocale,
  sourceText: string,
  translatedText: string,
  from: SeoLocale = SOURCE_CONTENT_LOCALE,
  fraseId?: string
): Promise<void> {
  if (locale === SOURCE_CONTENT_LOCALE || !translatedText.trim()) return;

  const entry: PhraseTranslationEntry = {
    fraseId: fraseId?.trim() || undefined,
    slug: slug.toLowerCase(),
    locale,
    text: translatedText.trim(),
    from,
    sourceHash: hashText(sourceText),
    at: Date.now(),
  };

  const key = storageKey(fraseId, slug, locale);
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
