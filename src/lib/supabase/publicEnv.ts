/**
 * InfoSec — variáveis permitidas no bundle do navegador (Vite).
 *
 * Somente prefixo VITE_ (sem NEXT_PUBLIC_* nem SUPABASE_* no cliente).
 *
 * PROIBIDO no frontend: DATABASE_URL, SERVICE_ROLE, POSTGRES_PASSWORD, etc.
 *
 * @see assertSafeBrowserSupabaseEnv em ./envGuard.ts
 */

import { assertSafeBrowserSupabaseEnv } from './envGuard';

export const PROJECT_SUPABASE_HOST = 'https://hnrulfjomufpxkitvfqg.supabase.co';

export const ALLOWED_BROWSER_SUPABASE_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
] as const;

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
  source: 'vite' | 'none';
};

function readEnv(key: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const v = env[key];
  return typeof v === 'string' ? v.trim() : '';
}

function pickUrl(): string {
  return readEnv('VITE_SUPABASE_URL');
}

function pickAnonKey(): string {
  return readEnv('VITE_SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
}

/** Resolve URL e chave pública para o cliente Supabase no browser. */
export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  assertSafeBrowserSupabaseEnv();

  const url = pickUrl();
  const anonKey = pickAnonKey();

  if (url && anonKey) {
    return { url, anonKey, source: 'vite' };
  }

  return { url, anonKey, source: 'none' };
}
