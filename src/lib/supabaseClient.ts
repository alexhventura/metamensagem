import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv } from './supabase/publicEnv';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getPublicSupabaseEnv();

/** Cliente browser — usa apenas a chave pública (anon / publishable). */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabase);
}

/**
 * Garante client configurado antes de queries (views, hooks, loaders).
 * @throws se VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não estiverem definidos
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_* (local) ou use a integração Vercel (SUPABASE_* / NEXT_PUBLIC_SUPABASE_*).'
    );
  }
  return supabase;
}
