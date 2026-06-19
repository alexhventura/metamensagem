/**
 * Build gate — projeto opera em modo CDN-only (sem Supabase obrigatório).
 * Variáveis VITE_SUPABASE_* são opcionais e ignoradas pelo app.
 */

const isVercel = process.env.VERCEL === '1';
const vercelEnv = process.env.VERCEL_ENV || 'development';

function pick(name) {
  return (process.env[name] || '').trim();
}

const url = pick('VITE_SUPABASE_URL');
const anonKey = pick('VITE_SUPABASE_ANON_KEY') || pick('VITE_SUPABASE_PUBLISHABLE_KEY');

if (url && anonKey) {
  console.warn(
    `[build] VITE_SUPABASE_* definido (${vercelEnv}) — app usa CDN estático; Supabase não é necessário no deploy.`
  );
} else if (isVercel) {
  console.log(`[build] CDN-only OK (${vercelEnv}) — busca e detalhe via public/frases-v2/`);
} else {
  console.log('[build] CDN-only — busca e detalhe via shards estáticos.');
}

process.exit(0);
