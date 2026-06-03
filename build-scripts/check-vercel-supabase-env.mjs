/**
 * Valida variáveis Supabase no build (Vercel / produção).
 * Compatível com integração Vercel Marketplace + GitHub deploy.
 */

const isVercel = process.env.VERCEL === '1';
const vercelEnv = process.env.VERCEL_ENV || 'development';
const isProdBuild =
  process.env.NODE_ENV === 'production' || vercelEnv === 'production' || vercelEnv === 'preview';

function pick(name) {
  return (process.env[name] || '').trim();
}

function pickUrl() {
  return (
    pick('VITE_SUPABASE_URL') ||
    pick('NEXT_PUBLIC_SUPABASE_URL') ||
    pick('SUPABASE_URL') ||
    ''
  );
}

function pickAnonKey() {
  return (
    pick('VITE_SUPABASE_ANON_KEY') ||
    pick('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    pick('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    pick('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    pick('SUPABASE_ANON_KEY') ||
    pick('SUPABASE_PUBLISHABLE_KEY') ||
    ''
  );
}

const url = pickUrl();
const anonKey = pickAnonKey();
const source = pick('VITE_SUPABASE_URL')
  ? 'VITE_*'
  : pick('NEXT_PUBLIC_SUPABASE_URL')
    ? 'NEXT_PUBLIC_* (integração Vercel)'
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
  '[build] Supabase: defina URL + chave pública (anon ou publishable). ' +
  'Integração Vercel injeta SUPABASE_* ou NEXT_PUBLIC_SUPABASE_*; manual: VITE_SUPABASE_*';

if (isVercel && isProdBuild) {
  console.error(msg);
  console.error(
    '[build] Vercel → Settings → Integrations → Supabase (projeto zkugnthamuwsrvikymii) em Production + Preview.'
  );
  process.exit(1);
}

if (isProdBuild) {
  console.warn(`${msg} Detalhe de frase usará fallback legado até configurar.`);
}

process.exit(0);
