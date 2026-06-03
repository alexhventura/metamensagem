/**
 * Top frases por popularidade — RPC get_top_frases (leve, sem JSONB).
 * UI (Fase 3) consumirá este loader.
 */

import { getSupabase, isSupabaseConfigured } from '../supabaseClient';

export type TopFrasePeriod = 'dia' | 'semana' | 'mes' | 'geral';

export type TopFraseHit = {
  id: string;
  slug: string;
  texto: string;
  autor: string;
  categoria: string;
  score: number;
};

export async function fetchTopFrases(
  periodo: TopFrasePeriod = 'semana',
  limite = 20
): Promise<TopFraseHit[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const sb = getSupabase();
    const { data, error } = await sb.rpc('get_top_frases', {
      p_periodo: periodo,
      p_limite: limite,
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.warn('[fraseTopLoader] get_top_frases', error.message);
      }
      return [];
    }

    return ((data ?? []) as TopFraseHit[]).map((row) => ({
      id: row.id,
      slug: row.slug?.toLowerCase?.() ?? row.slug,
      texto: row.texto,
      autor: row.autor,
      categoria: row.categoria,
      score: Number(row.score) || 0,
    }));
  } catch {
    return [];
  }
}

export function topFraseToListItem(hit: TopFraseHit) {
  return {
    id: hit.id,
    tipo: 'frase' as const,
    texto: hit.texto,
    autor: hit.autor,
    tags: hit.categoria ? [hit.categoria] : [],
    slug: hit.slug,
  };
}
