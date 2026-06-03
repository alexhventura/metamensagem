#!/usr/bin/env node
import { resolveDatabaseUrl, createPgClient } from './lib/connection.mjs';

const url = await resolveDatabaseUrl();
const client = createPgClient(url);
await client.connect();
const { rows } = await client.query(`
  select
    to_regclass('public.frases') as frases,
    to_regclass('public.frases_index') as frases_index,
    (select count(*)::int from public.frases) as frases_count,
    (select count(*)::int from public.frases_index) as index_count,
    (select case when to_regclass('public.frase_search_index') is not null
      then (select count(*)::int from public.frase_search_index)
      else null end) as search_index_count,
    (select case when to_regclass('public.frase_metrics') is not null
      then (select count(*)::int from public.frase_metrics)
      else null end) as metrics_count,
    (select count(*)::int from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_top_frases') as get_top_frases_fn,
    (select count(*)::int from get_top_frases('semana', 5)) as top_frases_sample_count
`);
console.log(rows[0]);
await client.end();
