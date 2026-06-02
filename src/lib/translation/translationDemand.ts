/**
 * Fila de demanda de tradução (sem PII) — localStorage + export para data/translation-queue.json.
 */

import type { SeoLocale } from '../../../lib/i18n/locales';
import { trackTranslationEvent } from '../analytics/translationAnalytics';
import { scheduleTranslationDemandSync } from './translationDemandSync';

const DEMAND_KEY = 'mm-translation-demand-v1';

/** Formato do acervo: phraseId → locale → contagem. */
export type TranslationDemandQueue = Record<string, Partial<Record<SeoLocale, number>>>;

type DemandMeta = {
  slug?: string;
  category?: string;
  countries?: Record<string, number>;
  lastAt?: number;
};

type DemandStore = {
  counts: TranslationDemandQueue;
  meta: Record<string, DemandMeta>;
};

function emptyStore(): DemandStore {
  return { counts: {}, meta: {} };
}

function readStore(): DemandStore {
  if (typeof localStorage === 'undefined') return emptyStore();
  try {
    const raw = localStorage.getItem(DEMAND_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as DemandStore;
    return {
      counts: parsed.counts || {},
      meta: parsed.meta || {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: DemandStore): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DEMAND_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function inferCountryCode(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const lang = navigator.language || '';
  const part = lang.split('-')[1];
  if (part && /^[a-z]{2}$/i.test(part)) return part.toUpperCase();
  return undefined;
}

export type RecordDemandInput = {
  phraseId: string;
  slug: string;
  locale: SeoLocale;
  category?: string;
};

/** Incrementa demanda e dispara analytics (sem IP). */
export function recordTranslationDemand(input: RecordDemandInput): void {
  const { phraseId, slug, locale, category } = input;
  const id = phraseId.trim();
  if (!id || !locale) return;

  const store = readStore();
  if (!store.counts[id]) store.counts[id] = {};
  store.counts[id][locale] = (store.counts[id][locale] ?? 0) + 1;

  const meta = store.meta[id] || {};
  meta.slug = slug;
  if (category) meta.category = category;
  meta.lastAt = Date.now();
  const country = inferCountryCode();
  if (country) {
    meta.countries = meta.countries || {};
    meta.countries[country] = (meta.countries[country] ?? 0) + 1;
  }
  store.meta[id] = meta;
  writeStore(store);

  trackTranslationEvent('translation_requested', {
    phrase_id: id,
    slug,
    locale,
    category,
    country,
    mode: 'contingency',
  });
  trackTranslationEvent('translation_missing', {
    phrase_id: id,
    slug,
    locale,
    category,
    country,
    mode: 'contingency',
  });

  scheduleTranslationDemandSync();
}

export function readTranslationDemandQueue(): TranslationDemandQueue {
  return readStore().counts;
}

export function readTranslationDemandMeta(): Record<string, DemandMeta> {
  return readStore().meta;
}

/** Export para colar em data/translation-demand-export.json antes do merge semanal. */
export function exportTranslationDemandForCi(): {
  queue: TranslationDemandQueue;
  meta: Record<string, DemandMeta>;
  exportedAt: string;
} {
  const store = readStore();
  return {
    queue: store.counts,
    meta: store.meta,
    exportedAt: new Date().toISOString(),
  };
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  (window as Window & { mmExportTranslationDemand?: typeof exportTranslationDemandForCi }).mmExportTranslationDemand =
    exportTranslationDemandForCi;
}
