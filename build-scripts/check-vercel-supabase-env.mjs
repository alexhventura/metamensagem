/**
 * Valida variáveis Supabase no build (Vercel / produção).
 * Evita deploy silencioso sem cliente configurado na Edge.
 *
 * Aceita:
 *   VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 *   ou SUPABASE_URL + SUPABASE_ANON_KEY (integração Vercel ↔ Supabase)
 */

const isVercel = process.env.VERCEL === '1';
const vercelEnv = process.env.VERCEL_ENV || 'development';
const isProdBuild =
  process.env.NODE_ENV === 'production' || vercelEnv === 'production' || vercelEnv === 'preview';

function pick(name) {
  return (process.env[name] || '').trim();
}

const url = pick('VITE_SUPABASE_URL') || pick('SUPABASE_URL');
const anonKey = pick('VITE_SUPABASE_ANON_KEY') || pick('SUPABASE_ANON_KEY');
const source = pick('VITE_SUPABASE_URL')
  ? 'VITE_*'
  : pick('SUPABASE_URL')
    ? 'SUPABASE_* (integração Vercel)'
    : 'nenhuma';

if (url && anonKey) {
  if (isVercel) {
    console.log(`[build] Supabase OK (${vercelEnv}, origem: ${source})`);
  }
  process.exit(0);
}

const msg =
  '[build] Supabase: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (ou SUPABASE_URL + SUPABASE_ANON_KEY da integração Vercel) não encontradas.';

if (isVercel && isProdBuild) {
  console.error(msg);
  console.error(
    '[build] Configure no painel Vercel → Settings → Environment Variables ou instale a integração Supabase (Marketplace).'
  );
  process.exit(1);
}

if (isProdBuild) {
  console.warn(`${msg} O detalhe de frase usará fallback legado até configurar.`);
}

process.exit(0);
