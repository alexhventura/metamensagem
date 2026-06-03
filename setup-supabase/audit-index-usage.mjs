#!/usr/bin/env node
/**
 * Relatório de uso de índices (pg_stat_user_indexes) — somente leitura.
 * Não remove nem altera índices; apenas recomendações.
 *
 * Uso: npm run supabase:audit-indexes
 */
import { resolveDatabaseUrl, createPgClient } from './lib/connection.mjs';

const url = await resolveDatabaseUrl();
if (!url) {
  console.error('❌ DATABASE_URL ausente (.env.local ou .env.scripts.local)');
  process.exit(1);
}

const client = createPgClient(url);
await client.connect();

const { rows } = await client.query(`
  select
    s.schemaname,
    s.relname as table_name,
    s.indexrelname as index_name,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch,
    pg_relation_size(s.indexrelid) as index_bytes,
    pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size,
    pg_get_indexdef(s.indexrelid) as index_def
  from pg_stat_user_indexes s
  where s.schemaname = 'public'
  order by pg_relation_size(s.indexrelid) desc, s.idx_scan asc
`);

const neverUsed = rows.filter((r) => Number(r.idx_scan) === 0);
const rarelyUsed = rows.filter((r) => {
  const scan = Number(r.idx_scan);
  return scan > 0 && scan < 10;
});

/** Agrupa por tabela + definição normalizada (ignora nome) para achar duplicatas prováveis. */
function normalizeDef(def) {
  return String(def || '')
    .replace(/\s+/g, ' ')
    .replace(/public\./g, '')
    .trim()
    .toLowerCase();
}

const byTable = new Map();
for (const r of rows) {
  const key = r.table_name;
  if (!byTable.has(key)) byTable.set(key, []);
  byTable.get(key).push(r);
}

const potentialDuplicates = [];
for (const [, tableRows] of byTable) {
  const byDef = new Map();
  for (const r of tableRows) {
    const norm = normalizeDef(r.index_def);
    if (!byDef.has(norm)) byDef.set(norm, []);
    byDef.get(norm).push(r);
  }
  for (const group of byDef.values()) {
    if (group.length > 1) {
      potentialDuplicates.push(group);
    }
  }
}

let totalIndexBytes = 0;
for (const r of rows) totalIndexBytes += Number(r.index_bytes);

console.log('\n=== Uso de índices (public) ===\n');
console.log(`Índices: ${rows.length} · tamanho total: ${(totalIndexBytes / 1024 / 1024).toFixed(1)} MB`);
console.log('(idx_scan = 0 pode ser normal em DB recém-reiniciado ou índice novo)\n');

console.log('--- Maiores índices (top 15) ---');
for (const r of rows.slice(0, 15)) {
  console.log(
    `  ${String(r.index_size).padStart(10)}  scan=${String(r.idx_scan).padStart(8)}  ${r.table_name}.${r.index_name}`
  );
}

console.log(`\n--- Nunca usados (idx_scan = 0): ${neverUsed.length} ---`);
for (const r of neverUsed.slice(0, 40)) {
  console.log(
    `  ${String(r.index_size).padStart(10)}  ${r.table_name}.${r.index_name}`
  );
}
if (neverUsed.length > 40) {
  console.log(`  … e mais ${neverUsed.length - 40}`);
}

console.log(`\n--- Raramente usados (1 ≤ idx_scan < 10): ${rarelyUsed.length} ---`);
for (const r of rarelyUsed.slice(0, 25)) {
  console.log(
    `  ${String(r.index_size).padStart(10)}  scan=${r.idx_scan}  ${r.table_name}.${r.index_name}`
  );
}

console.log(`\n--- Possíveis duplicatas (mesma definição, nomes diferentes): ${potentialDuplicates.length} grupos ---`);
for (const group of potentialDuplicates.slice(0, 10)) {
  console.log(`  Tabela ${group[0].table_name}:`);
  for (const r of group) {
    console.log(`    · ${r.index_name} (${r.index_size}, scan=${r.idx_scan})`);
  }
}

console.log('\n=== Recomendações (não executadas) ===\n');
console.log(
  '1. Confirme com EXPLAIN (ANALYZE, BUFFERS) nas queries reais antes de dropar qualquer índice.'
);
console.log(
  '2. Índices com idx_scan=0 após semanas de produção podem ser candidatos a revisão — não remova em massa.'
);
console.log(
  '3. Duplicatas com mesma definição: mantenha o índice com maior idx_scan; avalie o outro em janela de baixo tráfego.'
);
console.log(
  '4. Em free tier (~500 MB), priorize reduzir heap/backfill (frase_search_index) antes de remover índices de busca.'
);

await client.end();
