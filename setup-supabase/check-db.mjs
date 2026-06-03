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
    (select count(*)::int from public.frases_index) as index_count
`);
console.log(rows[0]);
await client.end();
