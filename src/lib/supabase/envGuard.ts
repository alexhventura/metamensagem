/**
 * Bloqueia secrets admin expostos via Vite (import.meta.env).
 * Mensagem detalhada só em dev — nunca na UI.
 */

/** Chaves públicas injetadas pela integração Vercel ↔ Supabase (anon + URL). */
const ALLOWED_PUBLIC_SUPABASE_KEYS = new Set(['SUPABASE_URL', 'SUPABASE_ANON_KEY']);

const EXPLICIT_DANGEROUS_KEYS = new Set([
  'VITE_SERVICE_ROLE',
  'VITE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_DATABASE_URL',
  'VITE_SUPABASE_DB_URL',
  'VITE_POSTGRES_URL',
  'VITE_DB_PASSWORD',
  'SERVICE_ROLE',
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const DANGEROUS_KEY_PATTERNS = [
  /service[_-]?role/i,
  /database[_-]?url/i,
  /postgres(?:ql)?/i,
  /(^|_)password($|_)/i,
  /secret[_-]?key/i,
  /private[_-]?key/i,
  /connection[_-]?string/i,
];

function isNonEmptyEnvValue(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim();
  return s.length > 0 && s !== 'undefined' && s !== 'false';
}

function keyLooksDangerous(key: string): boolean {
  if (ALLOWED_PUBLIC_SUPABASE_KEYS.has(key)) return false;
  if (EXPLICIT_DANGEROUS_KEYS.has(key)) return true;
  if (key.startsWith('SUPABASE_') && !ALLOWED_PUBLIC_SUPABASE_KEYS.has(key)) return true;
  return DANGEROUS_KEY_PATTERNS.some((re) => re.test(key));
}

function collectLeakedKeys(): string[] {
  const env = import.meta.env as Record<string, unknown>;
  const leaked: string[] = [];

  for (const key of Object.keys(env)) {
    if (!keyLooksDangerous(key)) continue;
    if (isNonEmptyEnvValue(env[key])) leaked.push(key);
  }

  return leaked;
}

let guardRan = false;

/** @throws impede bundle com credenciais admin em variáveis Vite */
export function assertSafeBrowserSupabaseEnv(): void {
  if (guardRan) return;
  guardRan = true;

  const leaked = collectLeakedKeys();
  if (!leaked.length) return;

  const hint =
    'Remova chaves admin do .env.local (use apenas VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no frontend). ' +
    'Service role e DATABASE_URL ficam só em scripts server-side, sem prefixo VITE_.';

  if (import.meta.env.DEV) {
    console.error(
      '[supabase] Bloqueado: variáveis sensíveis detectadas em import.meta.env:',
      leaked.join(', '),
      '—',
      hint
    );
  }

  throw new Error('Supabase: configuração insegura no cliente');
}
