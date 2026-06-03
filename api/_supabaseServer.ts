import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined;
let cachedServiceRole: SupabaseClient | null | undefined;

function readSupabaseUrl(): string | undefined {
  return process.env.VITE_SUPABASE_URL?.trim();
}

function createServerClient(key: string): SupabaseClient {
  return createClient(readSupabaseUrl()!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente Supabase no runtime Node (Vercel) — usa VITE_* expostas no deploy. */
export function getServerSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = readSupabaseUrl();
  const key =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key) {
    cached = null;
    return null;
  }

  cached = createServerClient(key);
  return cached;
}

/** Service role — upsert em frases_traducoes (nunca no bundle do cliente). */
export function getServerSupabaseServiceRole(): SupabaseClient | null {
  if (cachedServiceRole !== undefined) return cachedServiceRole;

  const url = readSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    cachedServiceRole = null;
    return null;
  }

  cachedServiceRole = createServerClient(key);
  return cachedServiceRole;
}
