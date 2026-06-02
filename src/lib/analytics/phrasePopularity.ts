/**
 * Popularidade local + eventos GA4/Clarity (phrase_view, copy, share, favorite).
 */

import { trackEvent } from './track';
import type { AnalyticsEventName } from './events';

const STORAGE_KEY = 'mm-phrase-popularity-v1';
const MAX_ENTRIES = 5000;

export type PopularityEvent = 'view' | 'share' | 'copy' | 'favorite';

const GA4_MAP: Record<PopularityEvent, AnalyticsEventName> = {
  view: 'phrase_view',
  copy: 'phrase_copy',
  share: 'phrase_share',
  favorite: 'favorite_add',
};

type ScoreMap = Record<string, Partial<Record<PopularityEvent, number>>>;

function readScores(): ScoreMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScoreMap) : {};
  } catch {
    return {};
  }
}

function writeScores(map: ScoreMap): void {
  if (typeof localStorage === 'undefined') return;
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    const ranked = keys
      .map((slug) => ({ slug, score: popularityScore(map[slug]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
    const trimmed: ScoreMap = {};
    for (const { slug } of ranked) trimmed[slug] = map[slug];
    map = trimmed;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function popularityScore(events: Partial<Record<PopularityEvent, number>> | undefined): number {
  if (!events) return 0;
  return (
    (events.view ?? 0) * 1 +
    (events.share ?? 0) * 4 +
    (events.copy ?? 0) * 3 +
    (events.favorite ?? 0) * 5
  );
}

export function trackPhraseEvent(
  slug: string,
  event: PopularityEvent,
  extra?: { phrase_id?: string; category?: string; locale?: string }
): void {
  const key = slug.toLowerCase();
  const map = readScores();
  const row = map[key] ?? {};
  row[event] = (row[event] ?? 0) + 1;
  map[key] = row;
  writeScores(map);

  trackEvent(GA4_MAP[event], {
    phrase_slug: key,
    phrase_id: extra?.phrase_id,
    category: extra?.category,
    locale: extra?.locale,
  });
}

export function getTopPhraseSlugs(limit = 100): string[] {
  const map = readScores();
  return Object.keys(map)
    .map((slug) => ({ slug, score: popularityScore(map[slug]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.slug);
}
