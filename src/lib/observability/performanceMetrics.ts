/**
 * Métricas leves de cache/latência (custo zero — memória + analytics opcional).
 * Não altera UX; alimenta debug e eventos estratégicos.
 */

export type CacheLayer = 'memory' | 'indexeddb' | 'cdn' | 'supabase' | 'miss';

export type PerformanceCounters = {
  cache_hit_memory: number;
  cache_hit_indexeddb: number;
  cache_hit_cdn: number;
  cache_hit_supabase: number;
  cache_miss: number;
  translation_hit: number;
  translation_miss: number;
  frase_detail_samples: number;
  frase_detail_latency_ms_sum: number;
  search_samples: number;
  search_latency_ms_sum: number;
};

const counters: PerformanceCounters = {
  cache_hit_memory: 0,
  cache_hit_indexeddb: 0,
  cache_hit_cdn: 0,
  cache_hit_supabase: 0,
  cache_miss: 0,
  translation_hit: 0,
  translation_miss: 0,
  frase_detail_samples: 0,
  frase_detail_latency_ms_sum: 0,
  search_samples: 0,
  search_latency_ms_sum: 0,
};

function bump(key: keyof PerformanceCounters, delta = 1): void {
  counters[key] += delta;
}

export function recordCacheHit(layer: CacheLayer): void {
  switch (layer) {
    case 'memory':
      bump('cache_hit_memory');
      break;
    case 'indexeddb':
      bump('cache_hit_indexeddb');
      break;
    case 'cdn':
      bump('cache_hit_cdn');
      break;
    case 'supabase':
      bump('cache_hit_supabase');
      break;
    case 'miss':
      bump('cache_miss');
      break;
  }
}

export function recordTranslationHit(hit: boolean): void {
  bump(hit ? 'translation_hit' : 'translation_miss');
}

export function recordFraseDetailLatency(ms: number, layer: CacheLayer): void {
  recordCacheHit(layer);
  bump('frase_detail_samples');
  bump('frase_detail_latency_ms_sum', Math.max(0, Math.round(ms)));
}

export function recordSearchLatency(ms: number): void {
  bump('search_samples');
  bump('search_latency_ms_sum', Math.max(0, Math.round(ms)));
}

export function getPerformanceCounters(): Readonly<PerformanceCounters> {
  return { ...counters };
}

export function resetPerformanceCounters(): void {
  for (const key of Object.keys(counters) as (keyof PerformanceCounters)[]) {
    counters[key] = 0;
  }
}

/** Snapshot para debug (DEV) ou fila analytics. */
export function performanceSnapshot(): PerformanceCounters & {
  frase_detail_latency_avg_ms: number | null;
  search_latency_avg_ms: number | null;
} {
  const snap = getPerformanceCounters();
  return {
    ...snap,
    frase_detail_latency_avg_ms:
      snap.frase_detail_samples > 0
        ? Math.round(snap.frase_detail_latency_ms_sum / snap.frase_detail_samples)
        : null,
    search_latency_avg_ms:
      snap.search_samples > 0
        ? Math.round(snap.search_latency_ms_sum / snap.search_samples)
        : null,
  };
}
