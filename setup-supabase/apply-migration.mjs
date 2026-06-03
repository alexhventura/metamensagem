#!/usr/bin/env node
/**
 * Aplica supabase/migrations/*.sql via DATABASE_URL (.env.local).
 * Uso: node setup-supabase/apply-migration.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  databaseUrlFromEnv,
  resolveDatabaseUrl,
  createPgClient,
} from './lib/connection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase',
  'migrations',
  '20260603000000_initial_frases_schema.sql'
);

async function main() {
  if (!fs.existsSync(MIGRATION)) {
    console.error('❌ Migração não encontrada:', MIGRATION);
    process.exit(1);
  }

  if (databaseUrlFromEnv() == null && /\[YOUR-PASSWORD\]/i.test(process.env.DATABASE_URL || '')) {
    console.error('❌ DATABASE_URL ainda com placeholder. Rode antes: npm run supabase:config');
    process.exit(1);
  }

  const databaseUrl = await resolveDatabaseUrl();
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const client = createPgClient(databaseUrl);

  console.log('📄 Aplicando migração:', path.basename(MIGRATION));

  try {
    await client.connect();
    await client.query(sql);
    const { rows } = await client.query(
      `SELECT to_regclass('public.frases') AS frases, to_regclass('public.frases_traducoes') AS traducoes`
    );
    console.log('✅ Migração aplicada.', rows[0]);
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (/already exists/i.test(msg)) {
      console.log('ℹ️ Objetos já existem — migração provavelmente já aplicada.');
      process.exit(0);
    }
    console.error('❌ Falha na migração:', msg.slice(0, 400));
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
