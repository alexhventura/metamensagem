#!/usr/bin/env node
/**
 * 1) Verifica tabela frases
 * 2) Aplica migração via pg (se DATABASE_URL/POSTGRES_PASSWORD funcionar)
 * 3) Importa data/import via API (SUPABASE_SERVICE_ROLE_KEY)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import {
  PROJECT_REF,
  databaseUrlFromEnv,
  resolveDatabaseUrl,
  createPgClient,
} from './lib/connection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260603000000_initial_frases_schema.sql');
const IMPORT_DIR = path.join(ROOT, 'data', 'import', 'shards');
const BATCH = 500;

function serviceClient() {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(
      '❌ Defina VITE_SUPABASE_URL em .env.local e SUPABASE_SERVICE_ROLE_KEY em .env.scripts.local'
    );
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function tableExists(sb) {
  const { error } = await sb.from('frases').select('id').limit(1);
  if (!error) return true;
  if (error.code === 'PGRST205') return false;
  console.error('❌ API:', error.message);
  process.exit(1);
}

async function applyMigrationPg() {
  if (/\[YOUR-PASSWORD\]/i.test(process.env.DATABASE_URL || '')) return false;
  let url = databaseUrlFromEnv();
  if (!url) {
    try {
      url = await resolveDatabaseUrl();
    } catch {
      return false;
    }
  }
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const client = createPgClient(url);
  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Migração aplicada via PostgreSQL');
    return true;
  } catch (e) {
    const msg = e?.message ?? '';
    if (/already exists/i.test(msg)) {
      console.log('ℹ️ Migração já aplicada (objetos existentes)');
      return true;
    }
    console.warn('⚠️ PostgreSQL direto falhou:', msg.slice(0, 120));
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function importShards(sb) {
  const file = path.join(IMPORT_DIR, 'shard-00.json');
  if (!fs.existsSync(file)) {
    console.error('❌', file, 'não encontrado');
    process.exit(1);
  }
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = list
    .map((raw) => {
      const texto = String(raw.frase_original ?? raw.texto ?? '').trim();
      if (!texto) return null;
      const slug = String(raw.slug || texto.slice(0, 80))
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/(^-|-$)/g, '');
      return {
        id: raw.id || `f_${slug}`,
        slug,
        frase_original: texto,
        autor_original: raw.autor_original ?? raw.autor ?? 'Anônimo',
        autor_slug: raw.autor_slug ?? raw.autorSlug ?? null,
        categoria: (raw.categoria || 'reflexao').toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'reflexao',
        contextos: raw.contextos ?? ['reflexao'],
        palavras_chave: raw.palavras_chave ?? raw.tags ?? ['reflexao'],
        explicacao: raw.explicacao ?? '',
        ano_ou_data: raw.ano_ou_data ?? null,
        fontes: raw.fontes ?? null,
        observacao: raw.observacao ?? null,
        autor_tipo: raw.autor_tipo ?? null,
        nacionalidade: raw.nacionalidade ?? null,
        nascimento_falecimento: raw.nascimento_falecimento ?? null,
        language_original: (raw.semantica?.idiomaOriginal || 'pt').slice(0, 2),
        popularidade: raw.popularidade ?? 0,
        shard: '00',
        semantica: raw.semantica ?? {},
        seo: raw.seo ?? {},
        informacoes: raw.informacoes ?? {},
      };
    })
    .filter(Boolean);

  console.log(`📦 Importando ${rows.length} frases via API…`);
  let ok = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await sb.from('frases').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error('❌ Lote', Math.floor(i / BATCH) + 1, error.message);
      process.exit(1);
    }
    ok += batch.length;
    console.log(`✅ Lote ${Math.floor(i / BATCH) + 1} enviado com sucesso (${batch.length} frases)`);
  }
  const { count } = await sb.from('frases').select('*', { count: 'exact', head: true });
  console.log(`✅ Total no banco: ${count ?? ok}`);
}

async function main() {
  console.log('Projeto:', PROJECT_REF);
  const sb = serviceClient();

  if (!(await tableExists(sb))) {
    console.log('📋 Tabela frases ausente — aplicando migração…');
    const applied = await applyMigrationPg();
    if (!applied) {
      console.error(`
❌ Não foi possível aplicar migração automaticamente.

Faça UMA vez no painel Supabase:
  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new

Cole o arquivo:
  supabase/migrations/20260603000000_initial_frases_schema.sql
→ Run

Ou cole em .env.local a URI "Session pooler" (Connect) em DATABASE_URL e rode:
  npm run supabase:migrate
`);
      process.exit(1);
    }
  } else {
    console.log('✅ Tabela frases já existe');
  }

  await importShards(sb);
}

main().catch((e) => {
  console.error('❌', e?.message ?? e);
  process.exit(1);
});
