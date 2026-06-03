#!/usr/bin/env node
/**
 * Gera DATABASE_URL (Session pooler) em .env.scripts.local a partir de POSTGRES_PASSWORD.
 * Uso: npm run supabase:sync-db-url
 */

import { buildPoolerUrl, PROJECT_REF } from './lib/connection.mjs';
import { ENV_SCRIPTS_PATH, readEnvFile, upsertEnvFile } from './lib/loadEnv.mjs';

const region = process.env.SUPABASE_POOLER_REGION?.trim() || 'sa-east-1';
const port = Number(process.env.SUPABASE_POOLER_PORT || '5432');

const pwd = readEnvFile(ENV_SCRIPTS_PATH, 'POSTGRES_PASSWORD');
if (!pwd || pwd === 'SUA_SENHA_NOVA') {
  console.error('❌ Defina POSTGRES_PASSWORD em .env.scripts.local (senha do painel Database).');
  process.exit(1);
}

const url = buildPoolerUrl(pwd, region, port);
upsertEnvFile(ENV_SCRIPTS_PATH, { DATABASE_URL: url });

console.log(`✅ DATABASE_URL gravada em .env.scripts.local`);
const aws = process.env.SUPABASE_POOLER_AWS?.trim() || 'aws-1';
console.log(`   pooler ${aws}-${region}.supabase.com:${port} · projeto ${PROJECT_REF}`);
console.log('   Rode: npm run supabase:migrate');
