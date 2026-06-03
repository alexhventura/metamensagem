/**
 * Conexão PostgreSQL (Supabase) — uso local apenas.
 * Senha via terminal; nunca commitar .env.local.
 */

import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  ENV_SCRIPTS_PATH,
  ENV_VITE_PATH,
  loadProjectEnv,
  readEnvFile,
  upsertEnvFile,
} from './loadEnv.mjs';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..', '..');
export const ENV_LOCAL_PATH = ENV_VITE_PATH;

loadProjectEnv();

export const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF?.trim() || 'hnrulfjomufpxkitvfqg';

export const DEFAULT_DB_TEMPLATE = `postgresql://postgres@db.${PROJECT_REF}.supabase.co:5432/postgres`;

export const SUPABASE_API_URL = `https://${PROJECT_REF}.supabase.co`;

export function buildDatabaseUrlWithPassword(baseUrl, plainPassword) {
  const encoded = encodeURIComponent(plainPassword);
  const normalized = String(baseUrl || DEFAULT_DB_TEMPLATE).replace(/^postgresql:\/\//i, 'http://');
  const u = new URL(normalized);
  const user = decodeURIComponent(u.username || 'postgres');
  const port = u.port || '5432';
  const pathname = u.pathname || '/postgres';
  return `postgresql://${user}:${encoded}@${u.hostname}:${port}${pathname}`;
}

/** URI Supabase Session pooler (usuário postgres.PROJECT_REF). Projetos novos usam aws-1-*. */
export function buildPoolerUrl(
  plainPassword,
  region = 'sa-east-1',
  port = 5432,
  awsPrefix = process.env.SUPABASE_POOLER_AWS?.trim() || 'aws-1'
) {
  const encoded = encodeURIComponent(plainPassword);
  return `postgresql://postgres.${PROJECT_REF}:${encoded}@${awsPrefix}-${region}.pooler.supabase.com:${port}/postgres`;
}

const POOLER_REGIONS = ['sa-east-1', 'us-east-1', 'eu-west-1'];
const POOLER_AWS_PREFIXES = ['aws-1', 'aws-0'];

/** Candidatos de conexão (DATABASE_URL → direct → poolers). */
export function listConnectionCandidates() {
  const candidates = [];
  const seen = new Set();
  const add = (url, label) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push({ url, label });
  };

  const directUrl = process.env.DATABASE_URL?.trim();
  if (directUrl && !databaseUrlNeedsPassword(directUrl)) {
    add(directUrl, 'DATABASE_URL em .env.scripts.local');
  }

  const pwd = process.env.POSTGRES_PASSWORD?.trim();
  if (pwd) {
    add(
      buildDatabaseUrlWithPassword(DEFAULT_DB_TEMPLATE, pwd),
      'db.*.supabase.co:5432 + POSTGRES_PASSWORD'
    );
    for (const aws of POOLER_AWS_PREFIXES) {
      for (const region of POOLER_REGIONS) {
        add(buildPoolerUrl(pwd, region, 5432, aws), `pooler ${aws}-${region}:5432`);
        add(buildPoolerUrl(pwd, region, 6543, aws), `pooler ${aws}-${region}:6543`);
      }
    }
  }

  return candidates;
}

function explainEnvPasswordLocation() {
  const inScripts = Boolean(readEnvFile(ENV_SCRIPTS_PATH, 'POSTGRES_PASSWORD'));
  const inVite = Boolean(readEnvFile(ENV_VITE_PATH, 'POSTGRES_PASSWORD'));
  if (inVite && !inScripts) {
    console.error(
      '   ⚠️ POSTGRES_PASSWORD está em .env.local — mova para .env.scripts.local (Vite não deve ver senha do banco).'
    );
  } else if (inScripts) {
    console.error('   POSTGRES_PASSWORD lida de .env.scripts.local (local correto).');
  } else {
    console.error('   Defina POSTGRES_PASSWORD ou DATABASE_URL em .env.scripts.local');
  }
  console.error('   .env.local = só VITE_SUPABASE_* (frontend).\n');
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
  upsertEnvFile(ENV_SCRIPTS_PATH, { DATABASE_URL: connectionString });
}

/** Persiste POSTGRES_PASSWORD + DATABASE_URL derivada (opcional após supabase:config). */
export function savePostgresPasswordToEnvLocal(plainPassword, connectionString) {
  upsertEnvFile(ENV_SCRIPTS_PATH, {
    POSTGRES_PASSWORD: plainPassword,
    DATABASE_URL: connectionString,
    SUPABASE_PROJECT_REF: PROJECT_REF,
  });
}

function readEnvLocalValue(key) {
  const scripts = readEnvFile(ENV_SCRIPTS_PATH, key);
  if (scripts) return scripts;
  return readEnvFile(ENV_VITE_PATH, key);
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

  savePostgresPasswordToEnvLocal(password, url);
  process.env.DATABASE_URL = url;
  process.env.POSTGRES_PASSWORD = password;

  console.log(`\n✅ Conectado (${test.info?.usr} @ ${test.info?.db})`);
  console.log('✅ DATABASE_URL salva em .env.scripts.local (senha codificada com encodeURIComponent)\n');

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
    console.log('  • Para importar frases (opcional): SUPABASE_SERVICE_ROLE_KEY em .env.scripts.local');
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

/**
 * Resolve URL do Postgres usando só .env.scripts.local — sem prompt no terminal.
 * Prompt interativo apenas em: npm run supabase:config
 */
export async function resolveDatabaseUrl({ allowPrompt = false } = {}) {
  const candidates = listConnectionCandidates();

  if (!candidates.length) {
    explainEnvPasswordLocation();
    console.error('❌ Sem POSTGRES_PASSWORD/DATABASE_URL em .env.scripts.local');
    console.error('   Primeira vez: npm run supabase:config');
    console.error('   Depois: npm run supabase:sync-db-url\n');
    if (allowPrompt && process.stdin.isTTY) {
      return setupSupabaseFromPasswordPrompt();
    }
    process.exit(1);
  }

  const failures = [];
  for (const { url, label } of candidates) {
    const probe = await testPgConnection(url);
    if (probe.ok) {
      console.log(`🔐 Conexão Postgres OK (${label})`);
      return url;
    }
    failures.push({ label, message: (probe.message || 'erro').slice(0, 160) });
  }

  console.error('\n❌ Nenhum host Postgres respondeu com a senha do .env.scripts.local\n');
  explainEnvPasswordLocation();
  for (const f of failures.slice(0, 5)) {
    console.error(`   • ${f.label}: ${f.message}`);
  }
  console.error(
    `\n   Atualize a senha: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database`
  );
  console.error('   Depois: npm run supabase:sync-db-url');
  console.error('   Ou cole a URI do Connect (Session pooler) em DATABASE_URL=\n');

  if (allowPrompt && process.stdin.isTTY) {
    return setupSupabaseFromPasswordPrompt();
  }

  process.exit(1);
}

export function createPgClient(connectionString) {
  return new Client({
    connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });
}
