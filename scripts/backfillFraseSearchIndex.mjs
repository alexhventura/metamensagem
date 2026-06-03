#!/usr/bin/env node
/**
 * Backfill frase_search_index a partir de frases_index + frases + frases_traducoes
 * ou shards CDN (public/frases-v2).
 *
 * Uso:
 *   npm run frases:search-index:backfill
 *   node scripts/backfillFraseSearchIndex.mjs --dry-run
 *   node scripts/backfillFraseSearchIndex.mjs --source=shards --batch-size=2000
 *   node scripts/backfillFraseSearchIndex.mjs --limit=5000 --offset=0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadProjectEnv } from '../setup-supabase/lib/loadEnv.mjs';
import { resolveDatabaseUrl, createPgClient } from '../setup-supabase/lib/connection.mjs';
import {
  buildSearchIndexRowsForPhrase,
  SEO_LOCALES,
} from '../lib/search/buildSearchIndexRow.mjs';

loadProjectEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FRASES_V2 = path.join(ROOT, 'public', 'frases-v2');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sourceArg = args.find((a) => a.startsWith('--source='));
const SOURCE = sourceArg?.split('=')[1] || 'db';
const batchSize =
  Number(args.find((a) => a.startsWith('--batch-size='))?.split('=')[1]) || 1500;
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || 0;
const offset = Number(args.find((a) => a.startsWith('--offset='))?.split('=')[1]) || 0;
const skipDetail = args.includes('--skip-detail');

async function assertTable(client, name) {
  const { rows } = await client.query('select to_regclass($1)::text as reg', [`public.${name}`]);
  if (rows[0]?.reg !== name) {
    console.error(`❌ Tabela public.${name} não existe. Rode: npm run supabase:migrate`);
    process.exit(1);
  }
}

async function upsertBatch(client, rows) {
  if (!rows.length) return;
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values = [];
    const params = [];
    let p = 1;
    for (const row of slice) {
      values.push(`($${p}, $${p + 1}, $${p + 2}, $${p + 3}::text[])`);
      params.push(row.frase_id, row.language, row.search_text, row.keywords);
      p += 4;
    }
    await client.query(
      `
      insert into public.frase_search_index (frase_id, language, search_text, keywords)
      values ${values.join(', ')}
      on conflict (frase_id, language) do update set
        search_text = excluded.search_text,
        keywords = excluded.keywords,
        updated_at = timezone('utc', now())
      `,
      params
    );
  }
}

async function loadTranslationsMap(client, fraseIds) {
  const map = new Map();
  if (!fraseIds.length) return map;

  const { rows } = await client.query(
    `
    select frase_id, locale, texto
    from public.frases_traducoes
    where is_official = true
      and frase_id = any($1::text[])
    `,
    [fraseIds]
  );

  for (const row of rows) {
    const id = row.frase_id;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push({ locale: row.locale, texto: row.texto });
  }
  return map;
}

async function backfillFromDb(client) {
  await assertTable(client, 'frases_index');
  await assertTable(client, 'frase_search_index');

  const { rows: countRows } = await client.query(
    'select count(*)::int as n from public.frases_index'
  );
  const total = countRows[0]?.n || 0;
  console.log(`📊 frases_index: ${total.toLocaleString('pt-BR')} frases`);

  let processed = 0;
  let upserted = 0;
  let cursor = offset;

  while (true) {
    if (limit > 0 && processed >= limit) break;

    const pageSize = limit > 0 ? Math.min(batchSize, limit - processed) : batchSize;

    const { rows: indexRows } = await client.query(
      `
      select
        fi.id,
        fi.titulo,
        c.slug as categoria_slug,
        f.frase_original,
        f.autor_original,
        f.language_original,
        f.contextos,
        f.palavras_chave
      from public.frases_index fi
      left join public.frases f on f.id = fi.id
      left join public.categorias c on c.id = fi.categoria_id
      order by fi.id
      limit $1 offset $2
      `,
      [pageSize, cursor]
    );

    if (!indexRows.length) break;

    const ids = indexRows.map((r) => r.id);
    const translationsMap = await loadTranslationsMap(client, ids);

    const flatRows = [];
    for (const row of indexRows) {
      const originalText = (row.frase_original || row.titulo || '').trim();
      if (!originalText) continue;

      const lang = SEO_LOCALES.includes(row.language_original) ? row.language_original : 'pt';
      const tags = Array.isArray(row.contextos) ? row.contextos : [];

      const built = buildSearchIndexRowsForPhrase({
        fraseId: row.id,
        languageOriginal: lang,
        originalText,
        autor: row.autor_original || undefined,
        categoria: row.categoria_slug || undefined,
        tags,
        palavrasChave: Array.isArray(row.palavras_chave) ? row.palavras_chave : [],
        translations: translationsMap.get(row.id) || [],
      });
      flatRows.push(...built);
    }

    if (!dryRun && flatRows.length) {
      await upsertBatch(client, flatRows);
    }

    processed += indexRows.length;
    upserted += flatRows.length;
    cursor += indexRows.length;

    console.log(
      `   … ${processed.toLocaleString('pt-BR')} frases · ${upserted.toLocaleString('pt-BR')} linhas índice`
    );

    if (indexRows.length < pageSize) break;
  }

  return { processed, upserted };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildDetailEnrichment(manifest) {
  const byId = new Map();
  if (skipDetail) return byId;

  for (const rel of manifest.detailShards || []) {
    const filePath = path.join(FRASES_V2, rel);
    if (!fs.existsSync(filePath)) continue;
    for (const row of readJson(filePath)) {
      if (!row.id) continue;
      byId.set(row.id, {
        texto: (row.frase_original || row.texto || '').trim(),
        contextos: Array.isArray(row.contextos) ? row.contextos : [],
        palavras_chave: Array.isArray(row.palavras_chave) ? row.palavras_chave : [],
        categoria: row.categoria,
        autor: row.autor_original,
        language_original: row.language_original,
      });
    }
  }
  return byId;
}

async function backfillFromShards(client) {
  await assertTable(client, 'frases_index');
  await assertTable(client, 'frase_search_index');

  const manifestPath = path.join(FRASES_V2, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ public/frases-v2/manifest.json não encontrado');
    process.exit(1);
  }

  const manifest = readJson(manifestPath);
  const detailById = buildDetailEnrichment(manifest);
  const indexShards = manifest.shards || [];

  let processed = 0;
  let upserted = 0;
  let skipped = offset;

  for (const rel of indexShards) {
    const filePath = path.join(FRASES_V2, rel);
    if (!fs.existsSync(filePath)) continue;

    const list = readJson(filePath);
    const batch = [];

    for (const item of list) {
      if (skipped > 0) {
        skipped--;
        continue;
      }
      if (limit > 0 && processed >= limit) break;

      const id = item.id;
      if (!id) continue;

      const enrich = detailById.get(id);
      const originalText = (enrich?.texto || item.titulo || '').trim();
      if (!originalText) continue;

      const lang = SEO_LOCALES.includes(enrich?.language_original)
        ? enrich.language_original
        : SEO_LOCALES.includes(item.languageOriginal)
          ? item.languageOriginal
          : 'pt';

      batch.push({
        fraseId: id,
        languageOriginal: lang,
        originalText,
        autor: enrich?.autor,
        categoria: enrich?.categoria || item.categoriaPrincipal,
        tags: enrich?.contextos || [],
        palavrasChave: enrich?.palavras_chave || [],
        translations: [],
      });
      processed++;

      if (batch.length >= batchSize) {
        const ids = batch.map((b) => b.fraseId);
        const translationsMap = await loadTranslationsMap(client, ids);
        const flatRows = batch.flatMap((b) =>
          buildSearchIndexRowsForPhrase({
            ...b,
            translations: translationsMap.get(b.fraseId) || [],
          })
        );
        if (!dryRun && flatRows.length) await upsertBatch(client, flatRows);
        upserted += flatRows.length;
        batch.length = 0;
        console.log(
          `   … ${processed.toLocaleString('pt-BR')} frases · ${upserted.toLocaleString('pt-BR')} linhas`
        );
      }
    }

    if (batch.length) {
      const ids = batch.map((b) => b.fraseId);
      const translationsMap = await loadTranslationsMap(client, ids);
      const flatRows = batch.flatMap((b) =>
        buildSearchIndexRowsForPhrase({
          ...b,
          translations: translationsMap.get(b.fraseId) || [],
        })
      );
      if (!dryRun && flatRows.length) await upsertBatch(client, flatRows);
      upserted += flatRows.length;
    }

    if (limit > 0 && processed >= limit) break;
  }

  return { processed, upserted };
}

async function main() {
  console.log('🔍 Backfill frase_search_index (multilíngue democrático)');
  console.log(`   source=${SOURCE} batch=${batchSize} dry-run=${dryRun}`);
  if (limit) console.log(`   limit=${limit} offset=${offset}`);

  const dbUrl = await resolveDatabaseUrl();
  if (!dbUrl) {
    console.error('❌ DATABASE_URL ausente (.env.local ou .env.scripts.local)');
    process.exit(1);
  }

  const client = createPgClient(dbUrl);
  await client.connect();

  try {
    const result =
      SOURCE === 'shards' ? await backfillFromShards(client) : await backfillFromDb(client);

    const { rows } = await client.query('select count(*)::int as n from public.frase_search_index');
    console.log(
      `\n✅ Concluído: ${result.processed.toLocaleString('pt-BR')} frases processadas, ` +
        `${result.upserted.toLocaleString('pt-BR')} linhas upsertadas` +
        (dryRun ? ' (dry-run — nada gravado)' : '')
    );
    console.log(`   frase_search_index total: ${rows[0]?.n?.toLocaleString('pt-BR') ?? 0}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
