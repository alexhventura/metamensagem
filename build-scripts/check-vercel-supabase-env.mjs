/**
 * Valida Supabase no build — exige VITE_* (projeto Vite; sem NEXT_PUBLIC_/SUPABASE_*).
 */

const isVercel = process.env.VERCEL === '1';
const vercelEnv = process.env.VERCEL_ENV || 'development';
const isProdBuild =
  process.env.NODE_ENV === 'production' || vercelEnv === 'production' || vercelEnv === 'preview';

function pick(name) {
  return (process.env[name] || '').trim();
}

const url = pick('VITE_SUPABASE_URL');
const anonKey = pick('VITE_SUPABASE_ANON_KEY') || pick('VITE_SUPABASE_PUBLISHABLE_KEY');

if (url && anonKey) {
  if (isVercel) {
    console.log(`[build] Supabase OK (${vercelEnv}, VITE_SUPABASE_*)`);
  }
  process.exit(0);
}

const msg =
  '[build] Supabase: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (chave anon/publishable). ' +
  'Na Vercel, remova variáveis NEXT_PUBLIC_* / POSTGRES_* / SERVICE_ROLE da integração — use só VITE_* no deploy.';

if (isVercel && isProdBuild) {
  console.error(msg);
  console.error(
    '[build] Vercel → Settings → Environment Variables → projeto hnrulfjomufpxkitvfqg (Production + Preview).'
  );
  process.exit(1);
}

if (isProdBuild) {
  console.warn(`${msg} Detalhe de frase usará fallback legado até configurar.`);
}

process.exit(0);
