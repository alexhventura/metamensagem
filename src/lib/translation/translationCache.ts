import { safeText } from '../safeContent';
import type { CardLang } from './types';

/** Persistência local — chave lógica: contentId + language (+ hash no valor). */
export const CACHE_KEY = 'translation-cache-v2';
const CACHE_MAX = 800;

export type TransCacheEntry = {
  contentId: string;
  language: CardLang;
  text: string;
  from: CardLang;
  sourceHash: string;
  at: number;
};

type TransCacheStore = Record<string, TransCacheEntry>;

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function cacheStorageKey(contentId: string | undefined, language: CardLang, sourceText: string): string {
  const id = safeText(contentId) || `txt_${hashText(sourceText)}`;
  return `${id}::${language}`;
}

export function computeSourceHash(sourceText: string): string {
  return hashText(sourceText);
}

export function readTranslationCache(): TransCacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TransCacheStore) : {};
  } catch {
    return {};
  }
}

export function writeTranslationCache(store: TransCacheStore): void {
  const keys = Object.keys(store);
  const trimmed =
    keys.length > CACHE_MAX
      ? Object.fromEntries(keys.slice(-CACHE_MAX).map((k) => [k, store[k]]))
      : store;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
}

export function removeCacheEntry(key: string): void {
  const store = readTranslationCache();
  if (store[key]) {
    delete store[key];
    writeTranslationCache(store);
  }
}

export function pruneLegacyTranslationCaches(): void {
  for (const legacy of [
    'mm-trans-cache-v1',
    'mm-trans-cache-v2',
    'mm-trans-cache-v3',
    'mm-trans-cache-v4',
  ]) {
    try {
      localStorage.removeItem(legacy);
    } catch {
      /* ignore */
    }
  }
}

/** Limpeza leve de entradas inválidas (sem carregar o motor de API). */
export function pruneInvalidTranslationCacheEntries(
  isBadEntry: (text: string, language: string) => boolean
): void {
  pruneLegacyTranslationCaches();
  const store = readTranslationCache();
  let changed = false;
  for (const [key, entry] of Object.entries(store)) {
    if (!entry?.text || !entry.language || entry.text.length < 2) {
      delete store[key];
      changed = true;
      continue;
    }
    if (isBadEntry(entry.text, entry.language)) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) writeTranslationCache(store);
}
