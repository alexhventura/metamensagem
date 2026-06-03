/**
 * Sincroniza eventos de popularidade com public.frase_metrics (Supabase RPC).
 * Falha silenciosa — localStorage permanece fonte offline.
 */

import { getSupabase, isSupabaseConfigured } from '../supabaseClient';

export type FraseMetricKind = 'views' | 'shares' | 'translation_requests' | 'search_hits';

const pending = new Map<string, { metric: FraseMetricKind; fraseId?: string; slug: string; delta: number }>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function queueKey(metric: FraseMetricKind, slug: string, fraseId?: string): string {
  return `${metric}|${fraseId ?? ''}|${slug.toLowerCase()}`;
}

export function queueFraseMetricIncrement(
  metric: FraseMetricKind,
  slug: string,
  fraseId?: string,
  delta = 1
): void {
  if (!slug.trim() || typeof window === 'undefined') return;
  if (!isSupabaseConfigured()) return;

  const key = queueKey(metric, slug, fraseId);
  const prev = pending.get(key);
  pending.set(key, {
    metric,
    slug: slug.toLowerCase(),
    fraseId,
    delta: (prev?.delta ?? 0) + delta,
  });

  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushFraseMetrics().catch(() => {
      /* fire-and-forget — métricas nunca quebram a UI */
    });
  }, 1200);
}

async function flushFraseMetrics(): Promise<void> {
  if (!pending.size || !isSupabaseConfigured()) return;

  const batch = [...pending.values()];
  pending.clear();

  let sb;
  try {
    sb = getSupabase();
  } catch {
    return;
  }

  for (const row of batch) {
    try {
      const { error } = await sb.rpc('mm_increment_frase_metric', {
        p_metric: row.metric,
        p_delta: Math.min(row.delta, 20),
        p_frase_id: row.fraseId ?? null,
        p_slug: row.slug,
      });
      if (error) {
        const code = (error as { code?: string }).code;
        if (code === '409' || code === '23505') continue;
        continue;
      }
    } catch {
      /* offline / quota / rede — métrica local permanece */
    }
  }
}

export function recordSearchHitsForResults(
  hits: Array<{ id: string; slug: string }>,
  max = 12
): void {
  for (const hit of hits.slice(0, max)) {
    queueFraseMetricIncrement('search_hits', hit.slug, hit.id, 1);
  }
}
