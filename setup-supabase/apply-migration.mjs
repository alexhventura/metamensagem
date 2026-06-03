#!/usr/bin/env node
/**
 * Aplica supabase/migrations/*.sql de forma idempotente.
 * - Tabela public.mm_schema_migrations registra arquivos já aplicados
 * - Detecta estrutura existente (frases / frases_index) e pula ou registra migrações antigas
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  databaseUrlFromEnv,
  resolveDatabaseUrl,
  createPgClient,
} from './lib/connection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

const MIGRATIONS_TABLE = 'public.mm_schema_migrations';

/** Se o objeto já existe no banco, a migração é considerada aplicada. */
const PREFLIGHT_CHECKS = {
  '20260603000000_initial_frases_schema.sql': {
    label: 'public.frases',
    sql: `select to_regclass('public.frases')::text as reg`,
    expect: 'frases',
  },
  '20260603000001_search_and_metadata.sql': {
    label: 'public.frases_index',
    sql: `select to_regclass('public.frases_index')::text as reg`,
    expect: 'frases_index',
  },
  '20260603110000_frase_search_index.sql': {
    label: 'public.frase_search_index',
    sql: `select to_regclass('public.frase_search_index')::text as reg`,
    expect: 'frase_search_index',
  },
};

const ALREADY_APPLIED_PATTERNS = [
  /already exists/i,
  /duplicate key/i,
  /relation .* already exists/i,
];

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({
      name,
      path: path.join(MIGRATIONS_DIR, name),
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'),
      checksum: checksumOf(fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8')),
    }));
}

function checksumOf(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
}

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists ${MIGRATIONS_TABLE} (
      filename text primary key,
      checksum text,
      applied_at timestamptz not null default timezone('utc', now())
    );
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query(
    `select filename, checksum from ${MIGRATIONS_TABLE} order by filename`
  );
  return new Map(rows.map((r) => [r.filename, r.checksum]));
}

async function isStructurallyApplied(client, filename) {
  const check = PREFLIGHT_CHECKS[filename];
  if (!check) return false;
  const { rows } = await client.query(check.sql);
  return rows[0]?.reg === check.expect;
}

async function recordMigration(client, filename, checksum) {
  await client.query(
    `
    insert into ${MIGRATIONS_TABLE} (filename, checksum)
    values ($1, $2)
    on conflict (filename) do update set
      checksum = excluded.checksum,
      applied_at = timezone('utc', now())
    `,
    [filename, checksum]
  );
}

async function bootstrapLegacyState(client, files, applied) {
  let bootstrapped = 0;
  for (const file of files) {
    if (applied.has(file.name)) continue;
    if (!(await isStructurallyApplied(client, file.name))) continue;

    await recordMigration(client, file.name, file.checksum);
    const check = PREFLIGHT_CHECKS[file.name];
    console.log(
      `   📌 Registrada como aplicada (estrutura já existe: ${check?.label ?? file.name}):`,
      file.name
    );
    bootstrapped++;
  }
  return bootstrapped;
}

function isBenignMigrationError(message) {
  return ALREADY_APPLIED_PATTERNS.some((re) => re.test(message));
}

async function runMigrationFile(client, file) {
  await client.query('begin');
  try {
    await client.query(file.sql);
    await recordMigration(client, file.name, file.checksum);
    await client.query('commit');
    return { ok: true };
  } catch (err) {
    await client.query('rollback');
    const msg = err?.message ?? String(err);

    if (isBenignMigrationError(msg)) {
      await recordMigration(client, file.name, file.checksum);
      return { ok: true, skipped: true, reason: msg.slice(0, 120) };
    }

    if (await isStructurallyApplied(client, file.name)) {
      await recordMigration(client, file.name, file.checksum);
      return {
        ok: true,
        skipped: true,
        reason: 'estrutura alvo já presente após erro parcial',
      };
    }

    return { ok: false, error: msg };
  }
}

async function main() {
  const files = listMigrationFiles();
  if (!files.length) {
    console.error('❌ Nenhum .sql em supabase/migrations/');
    process.exit(1);
  }

  if (databaseUrlFromEnv() == null && /\[YOUR-PASSWORD\]/i.test(process.env.DATABASE_URL || '')) {
    console.error('❌ DATABASE_URL com placeholder. Use .env.scripts.local ou: npm run supabase:config');
    process.exit(1);
  }

  const databaseUrl = await resolveDatabaseUrl();
  const client = createPgClient(databaseUrl);

  try {
    await client.connect();
    await ensureMigrationsTable(client);

    console.log('🗂️  Migrações idempotentes (mm_schema_migrations)\n');

    const applied = await getAppliedMigrations(client);
    const bootstrapped = await bootstrapLegacyState(client, files, applied);
    if (bootstrapped) console.log('');

    const appliedAfter = await getAppliedMigrations(client);
    let ran = 0;
    let skipped = 0;

    for (const file of files) {
      if (appliedAfter.has(file.name)) {
        const prev = appliedAfter.get(file.name);
        if (prev && prev !== file.checksum) {
          console.warn(
            `   ⚠️ ${file.name} foi alterado desde a última aplicação (checksum diferente).`
          );
        }
        console.log('   ⏭️  já aplicada:', file.name);
        skipped++;
        continue;
      }

      if (await isStructurallyApplied(client, file.name)) {
        await recordMigration(client, file.name, file.checksum);
        const check = PREFLIGHT_CHECKS[file.name];
        console.log(
          `   ⏭️  pulada (${check?.label ?? 'estrutura'} já existe):`,
          file.name
        );
        skipped++;
        continue;
      }

      console.log('   📄 aplicando:', file.name);
      const result = await runMigrationFile(client, file);
      if (!result.ok) {
        console.error('   ❌', result.error?.slice(0, 400));
        process.exit(1);
      }
      if (result.skipped) {
        console.log('   ℹ️  registrada:', file.name, '—', result.reason);
      } else {
        console.log('   ✅', file.name);
      }
      ran++;
    }

    const { rows } = await client.query(`
      select
        to_regclass('public.frases')::text as frases,
        to_regclass('public.frases_index')::text as frases_index,
        (select count(*)::int from public.mm_schema_migrations) as migrations_logged
    `);
    console.log('\n✅ Concluído.', {
      aplicadas_agora: ran,
      puladas: skipped,
      bootstrapped,
      estado: rows[0],
    });
  } catch (err) {
    console.error('❌ Falha:', (err?.message ?? String(err)).slice(0, 400));
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
