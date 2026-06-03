/**
 * Conexão PostgreSQL (Supabase) — uso local apenas.
 * Senha via terminal; nunca commitar .env.local.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..', '..');
export const ENV_LOCAL_PATH = path.join(ROOT, '.env.local');

export const DEFAULT_DB_TEMPLATE =
  'postgresql://postgres@db.zkugnthamuwsrvikymii.supabase.co:5432/postgres';

export const PROJECT_REF = 'zkugnthamuwsrvikymii';
export const SUPABASE_API_URL = `https://${PROJECT_REF}.supabase.co`;

dotenv.config({ path: ENV_LOCAL_PATH });
dotenv.config();

export function buildDatabaseUrlWithPassword(baseUrl, plainPassword) {
  const encoded = encodeURIComponent(plainPassword);
  const normalized = String(baseUrl || DEFAULT_DB_TEMPLATE).replace(/^postgresql:\/\//i, 'http://');
  const u = new URL(normalized);
  const user = decodeURIComponent(u.username || 'postgres');
  const port = u.port || '5432';
  const pathname = u.pathname || '/postgres';
  return `postgresql://${user}:${encoded}@${u.hostname}:${port}${pathname}`;
}

export function databaseUrlNeedsPassword(url) {
  if (!url) return true;
  return (
    /\[YOUR-PASSWORD\]|YOUR-PASSWORD/i.test(url) ||
    !/postgresql:\/\/[^:]+:[^@]+@/.test(url)
  );
}

export function askPasswordInteractive(
  prompt = 'Senha do Postgres (Supabase → Database → password): '
) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
      return;
    }

    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(prompt);

    let password = '';
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    const onData = (chunk) => {
      const ch = chunk.toString('utf8');
      const char = ch.length === 1 ? ch : ch.slice(-1);

      if (ch === '\n' || ch === '\r' || ch === '\u0004' || (ch.includes('\r') && ch.includes('\n'))) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        stdout.write('\n');
        resolve(password);
        return;
      }
      if (ch === '\u0003') process.exit(130);
      if (char === '\u007f' || char === '\b') {
        password = password.slice(0, -1);
        return;
      }
      if (char.charCodeAt(0) >= 32) password += char;
    };

    stdin.on('data', onData);
  });
}

export async function testPgConnection(connectionString) {
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15_000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    const { rows } = await client.query('SELECT current_database() AS db, current_user AS usr');
    return { ok: true, info: rows[0] };
  } catch (err) {
    return { ok: false, message: err?.message ?? String(err) };
  } finally {
    await client.end().catch(() => {});
  }
}

export function saveDatabaseUrlToEnvLocal(connectionString) {
  let content = fs.existsSync(ENV_LOCAL_PATH) ? fs.readFileSync(ENV_LOCAL_PATH, 'utf8') : '';
  const escaped = connectionString.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const line = `DATABASE_URL="${escaped}"`;

  if (/^DATABASE_URL=/m.test(content)) {
    content = content.replace(/^DATABASE_URL=.*$/m, line);
  } else {
    content = content.trimEnd() + (content.endsWith('\n') || !content ? '' : '\n') + line + '\n';
  }

  fs.writeFileSync(ENV_LOCAL_PATH, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function readEnvLocalValue(key) {
  if (!fs.existsSync(ENV_LOCAL_PATH)) return '';
  const m = fs.readFileSync(ENV_LOCAL_PATH, 'utf8').match(new RegExp(`^${key}=(.+)$`, 'm'));
  if (!m) return '';
  return m[1].replace(/^["']|["']$/g, '').trim();
}

export function auditFrontendEnv() {
  const viteUrl = readEnvLocalValue('VITE_SUPABASE_URL') || process.env.VITE_SUPABASE_URL?.trim();
  const viteAnon =
    readEnvLocalValue('VITE_SUPABASE_ANON_KEY') || process.env.VITE_SUPABASE_ANON_KEY?.trim();
  const serviceRole = readEnvLocalValue('SUPABASE_SERVICE_ROLE_KEY')?.trim();

  return {
    viteUrl: viteUrl || '',
    viteAnon: viteAnon || '',
    serviceRole: serviceRole || '',
    viteOk: Boolean(viteUrl && viteAnon),
    importOk: Boolean(serviceRole),
  };
}

/**
 * Fluxo interativo: só pede a senha, testa e grava DATABASE_URL.
 */
export async function setupSupabaseFromPasswordPrompt() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  MetaMensagem — login do banco Supabase (local)  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Projeto:', PROJECT_REF);
  console.log('  Host:    db.' + PROJECT_REF + '.supabase.co');
  console.log('');
  console.log('  Use a senha do Postgres (não é a chave anon do frontend).');
  console.log('  Dashboard → Project Settings → Database → Database password');
  console.log('');

  const password = (await askPasswordInteractive('  Digite a senha: ')).trim();
  if (!password) {
    console.error('\n❌ Senha vazia. Tente novamente.\n');
    process.exit(1);
  }

  const template = process.env.DATABASE_URL?.trim() || DEFAULT_DB_TEMPLATE;
  const url = buildDatabaseUrlWithPassword(template, password);

  console.log('\n  Testando conexão…');
  const test = await testPgConnection(url);
  if (!test.ok) {
    console.error('\n❌ Falha:', test.message?.slice(0, 220));
    console.error('   Confira a senha no painel Supabase.\n');
    process.exit(1);
  }

  saveDatabaseUrlToEnvLocal(url);
  process.env.DATABASE_URL = url;

  console.log(`\n✅ Conectado (${test.info?.usr} @ ${test.info?.db})`);
  console.log('✅ DATABASE_URL salva em .env.local (senha codificada com encodeURIComponent)\n');

  const audit = auditFrontendEnv();
  console.log('── Próximos passos ──');
  if (!audit.viteOk) {
    console.log('  • Adicione no .env.local (frontend / Vercel):');
    console.log(`    VITE_SUPABASE_URL="${SUPABASE_API_URL}"`);
    console.log('    VITE_SUPABASE_ANON_KEY="<chave anon do Dashboard → API>"');
  } else {
    console.log('  • VITE_SUPABASE_* já configurado no .env.local');
  }
  if (!audit.importOk) {
    console.log('  • Para importar frases (opcional): SUPABASE_SERVICE_ROLE_KEY no .env.local');
  }
  console.log('  • Importar shards: npm run frases:import:supabase:dry');
  console.log('');

  return url;
}

/**
 * Usado pelo importador: reutiliza URL válida ou pede senha.
 */
/** Monta URL a partir de DATABASE_URL ou POSTGRES_PASSWORD (sem prompt). */
export function databaseUrlFromEnv() {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct && !databaseUrlNeedsPassword(direct)) return direct;
  const pwd = process.env.POSTGRES_PASSWORD?.trim();
  if (pwd) return buildDatabaseUrlWithPassword(DEFAULT_DB_TEMPLATE, pwd);
  return null;
}

export async function resolveDatabaseUrl({ forcePrompt = false } = {}) {
  const fromEnv = databaseUrlFromEnv();
  if (fromEnv && !forcePrompt) {
    const probe = await testPgConnection(fromEnv);
    if (probe.ok) {
      console.log('🔐 Conexão Postgres OK');
      return fromEnv;
    }
    console.warn('⚠️ Falha na conexão — será solicitada a senha.');
  }

  const template = process.env.DATABASE_URL?.trim() || DEFAULT_DB_TEMPLATE;
  let url = template;

  if (!forcePrompt && !databaseUrlNeedsPassword(url)) {
    const probe = await testPgConnection(url);
    if (probe.ok) {
      console.log('🔐 DATABASE_URL válida (.env.local)');
      return url;
    }
    console.warn('⚠️ Conexão falhou — será solicitada a senha novamente.');
  }

  return setupSupabaseFromPasswordPrompt();
}

export function createPgClient(connectionString) {
  return new Client({
    connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });
}
