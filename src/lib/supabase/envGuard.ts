/**
 * Bloqueia secrets admin expostos via Vite (import.meta.env).
 * Mensagem detalhada só em dev — nunca na UI.
 */

/** Chaves públicas permitidas no bundle (somente VITE_*). */
const ALLOWED_PUBLIC_SUPABASE_KEYS = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
]);

const EXPLICIT_DANGEROUS_KEYS = new Set([
  'VITE_SERVICE_ROLE',
  'VITE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_DATABASE_URL',
  'VITE_SUPABASE_DB_URL',
  'VITE_POSTGRES_URL',
  'VITE_DB_PASSWORD',
  'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  'SERVICE_ROLE',
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'POSTGRES_URL',
  'POSTGRES_PASSWORD',
  'POSTGRES_PRISMA_URL',
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
  if (key.startsWith('SUPABASE_')) return true;
  if (key.startsWith('NEXT_PUBLIC_')) return true;
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
    'Remova secrets admin do ambiente de build. No browser use só URL + anon/publishable. ' +
    'POSTGRES_* e SERVICE_ROLE ficam apenas no servidor/scripts locais.';

  if (import.meta.env.DEV) {
    console.error(
      '[supabase] Bloqueado: variáveis sensíveis em import.meta.env:',
      leaked.join(', '),
      '—',
      hint
    );
  }

  throw new Error('Supabase: configuração insegura no cliente');
}
