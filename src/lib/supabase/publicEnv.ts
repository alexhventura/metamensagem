/**
 * InfoSec — variáveis permitidas no bundle do navegador (Vite).
 *
 * Ordem (integração Vercel/GitHub + Supabase + cadastro manual):
 *   URL:  VITE_SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL → SUPABASE_URL
 *   Key:  VITE_*_ANON_KEY → NEXT_PUBLIC_*_ANON_KEY → SUPABASE_ANON_KEY → *_PUBLISHABLE_KEY
 *
 * PROIBIDO no frontend: DATABASE_URL, SERVICE_ROLE, POSTGRES_PASSWORD, etc.
 *
 * @see assertSafeBrowserSupabaseEnv em ./envGuard.ts
 */

import { assertSafeBrowserSupabaseEnv } from './envGuard';

export const PROJECT_SUPABASE_HOST = 'https://zkugnthamuwsrvikymii.supabase.co';

export const ALLOWED_BROWSER_SUPABASE_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
] as const;

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
  source: 'vite' | 'vercel-integration' | 'next-public' | 'none';
};

function readEnv(key: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const v = env[key];
  return typeof v === 'string' ? v.trim() : '';
}

function pickUrl(): { url: string; source: PublicSupabaseEnv['source'] } {
  const vite = readEnv('VITE_SUPABASE_URL');
  if (vite) return { url: vite, source: 'vite' };

  const next = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  if (next) return { url: next, source: 'next-public' };

  const integration = readEnv('SUPABASE_URL');
  if (integration) return { url: integration, source: 'vercel-integration' };

  return { url: '', source: 'none' };
}

function pickAnonKey(): string {
  return (
    readEnv('VITE_SUPABASE_ANON_KEY') ||
    readEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    readEnv('SUPABASE_ANON_KEY') ||
    readEnv('SUPABASE_PUBLISHABLE_KEY') ||
    ''
  );
}

/** Resolve URL e chave pública para o cliente Supabase no browser. */
export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  assertSafeBrowserSupabaseEnv();

  const { url, source: urlSource } = pickUrl();
  const anonKey = pickAnonKey();

  if (url && anonKey) {
    const source =
      urlSource === 'vite' && readEnv('VITE_SUPABASE_ANON_KEY')
        ? 'vite'
        : urlSource === 'next-public'
          ? 'next-public'
          : 'vercel-integration';
    return { url, anonKey, source };
  }

  return { url, anonKey, source: 'none' };
}
