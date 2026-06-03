#!/usr/bin/env node
import { resolveDatabaseUrl, createPgClient } from './lib/connection.mjs';

const url = await resolveDatabaseUrl();
const client = createPgClient(url);
await client.connect();

const { rows } = await client.query(`
  SELECT
    tablename,
    pg_total_relation_size(quote_ident('public')||'.'||quote_ident(tablename)) AS bytes,
    pg_size_pretty(pg_total_relation_size(quote_ident('public')||'.'||quote_ident(tablename))) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY bytes DESC
`);

let total = 0;
console.log('\n=== Tamanho por tabela (public) ===\n');
for (const r of rows) {
  total += Number(r.bytes);
  const mb = (Number(r.bytes) / 1024 / 1024).toFixed(1);
  console.log(`${String(r.size).padStart(10)}  ${r.tablename.padEnd(28)} ${mb} MB`);
}
console.log(`\nSubtotal public: ${(total / 1024 / 1024).toFixed(1)} MB`);

const db = await client.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size`);
console.log(`Database total: ${db.rows[0].db_size}`);

const counts = await client.query(`
  SELECT
    (SELECT count(*)::bigint FROM frases) AS frases,
    (SELECT count(*)::bigint FROM frases_index) AS frases_index,
    (SELECT count(*)::bigint FROM frase_search_index) AS frase_search_index,
    (SELECT count(*)::bigint FROM frases_traducoes) AS frases_traducoes,
    (SELECT count(*)::bigint FROM translation_requests) AS translation_requests,
    (SELECT count(*)::bigint FROM frase_metrics) AS frase_metrics,
    (SELECT count(*)::bigint FROM frase_metrics_daily) AS frase_metrics_daily
`);
console.log('\n=== Contagens ===\n', counts.rows[0]);

const avg = await client.query(`
  SELECT
    pg_size_pretty(avg(octet_length(frase_original))::bigint) AS avg_frase_original,
    pg_size_pretty(avg(octet_length(explicacao))::bigint) AS avg_explicacao,
    pg_size_pretty(avg(octet_length(coalesce(semantica::text,'')))::bigint) AS avg_semantica_json,
    pg_size_pretty(avg(octet_length(coalesce(seo::text,'')))::bigint) AS avg_seo_json
  FROM frases
`);
console.log('\n=== Média por linha (frases) ===\n', avg.rows[0]);

const searchLang = await client.query(`
  SELECT language, count(*)::int AS n
  FROM frase_search_index
  GROUP BY language
  ORDER BY n DESC
`);
console.log('\n=== frase_search_index por idioma ===');
for (const r of searchLang.rows) console.log(`  ${r.language}: ${r.n.toLocaleString()}`);

const explainTotal = await client.query(`
  SELECT
    count(*) FILTER (WHERE length(trim(explicacao)) > 0)::int AS com_explicacao,
    pg_size_pretty(sum(octet_length(explicacao))::bigint) AS total_explicacao_bytes
  FROM frases
`);
console.log('\n=== Explicações em frases ===\n', explainTotal.rows[0]);

const idx = await client.query(`
  SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public' AND relname = 'frases_index'
  ORDER BY pg_relation_size(indexrelid) DESC
`);
console.log('\n=== Índices frases_index ===');
for (const r of idx.rows) console.log(`  ${String(r.size).padStart(10)}  ${r.indexrelname}`);

const heapIdx = await client.query(`
  SELECT
    pg_size_pretty(pg_relation_size('public.frases_index')) AS heap,
    pg_size_pretty(pg_total_relation_size('public.frases_index') - pg_relation_size('public.frases_index')) AS indexes
`);
console.log('\nfrases_index heap vs indexes:', heapIdx.rows[0]);

const searchProj = Math.round((90100 / 467628) * 98);
console.log(`\nProjeção frase_search_index se backfill completo (~467k pt): ~${Math.round(98 * (467628 / 90100))} MB (atual ${98} MB @ ${90100} rows)`);

await client.end();
