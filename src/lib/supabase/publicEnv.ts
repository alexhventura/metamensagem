/**
 * InfoSec — variáveis permitidas no bundle do navegador (Vite).
 *
 * Ordem de leitura (compatível com cadastro manual e integração Vercel ↔ Supabase):
 *   URL:  VITE_SUPABASE_URL  →  SUPABASE_URL
 *   Key:  VITE_SUPABASE_ANON_KEY  →  SUPABASE_ANON_KEY
 *
 * PROIBIDO no frontend: DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, senhas Postgres.
 *
 * @see assertSafeBrowserSupabaseEnv em ./envGuard.ts
 */

import { assertSafeBrowserSupabaseEnv } from './envGuard';

export const ALLOWED_BROWSER_SUPABASE_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
] as const;

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
  /** Qual par de variáveis foi resolvido (debug / logs de build). */
  source: 'vite' | 'vercel-integration' | 'none';
};

function readEnv(key: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const v = env[key];
  return typeof v === 'string' ? v.trim() : '';
}

/** Resolve URL e anon key com fallback da integração oficial Vercel + Supabase. */
export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  assertSafeBrowserSupabaseEnv();

  const viteUrl = readEnv('VITE_SUPABASE_URL');
  const viteKey = readEnv('VITE_SUPABASE_ANON_KEY');
  if (viteUrl && viteKey) {
    return { url: viteUrl, anonKey: viteKey, source: 'vite' };
  }

  const integrationUrl = readEnv('SUPABASE_URL');
  const integrationKey = readEnv('SUPABASE_ANON_KEY');
  if (integrationUrl && integrationKey) {
    return { url: integrationUrl, anonKey: integrationKey, source: 'vercel-integration' };
  }

  const url = viteUrl || integrationUrl;
  const anonKey = viteKey || integrationKey;
  return { url, anonKey, source: 'none' };
}
