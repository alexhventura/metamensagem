import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined;

/** Cliente Supabase no runtime Node (Vercel) — usa VITE_* expostas no deploy. */
export function getServerSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key) {
    cached = null;
    return null;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
