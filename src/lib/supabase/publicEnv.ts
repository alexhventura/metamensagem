/**
 * InfoSec — variáveis permitidas no bundle do navegador (Vite).
 *
 * Regra: somente chaves com prefixo VITE_ entram em import.meta.env.
 * PROIBIDO no frontend: DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, senhas Postgres.
 *
 * @see assertSafeBrowserSupabaseEnv em ./envGuard.ts
 */

import { assertSafeBrowserSupabaseEnv } from './envGuard';

export const ALLOWED_BROWSER_SUPABASE_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

/** Lê exclusivamente as duas variáveis públicas do Supabase. */
export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  assertSafeBrowserSupabaseEnv();
  return {
    url: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  };
}
