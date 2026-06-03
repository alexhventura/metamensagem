#!/usr/bin/env node
/**
 * Importa data/search-index/ → categorias, tags, frases_index (PostgreSQL via pooler).
 * Uso: npm run frases:index:importar
 *      node scripts/importarIndiceSupabase.js --dry-run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadProjectEnv } from '../setup-supabase/lib/loadEnv.mjs';
import { resolveDatabaseUrl, createPgClient } from '../setup-supabase/lib/connection.mjs';

loadProjectEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INDEX_DIR = path.join(ROOT, 'data', 'search-index');
const BATCH_SIZE = 5000;
const TITULO_MAX = 160;
const TAGS_INSERT_CHUNK = 5000;

const dryRun = process.argv.includes('--dry-run');

function readJson(relPath) {
  const abs = path.join(INDEX_DIR, relPath);
  if (!fs.existsSync(abs)) {
    console.error('❌ Arquivo não encontrado:', abs);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function truncateTitulo(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return 'frase';
  return t.length <= TITULO_MAX ? t : `${t.slice(0, TITULO_MAX - 1)}…`;
}

async function assertTable(client, name) {
  const { rows } = await client.query('select to_regclass($1)::text as reg', [`public.${name}`]);
  if (rows[0]?.reg !== name) {
    console.error(`❌ Tabela public.${name} não existe. Rode: npm run supabase:migrate`);
    process.exit(1);
  }
}

async function insertCategorias(client, categorias) {
  if (!categorias.length) return;
  const slugs = categorias.map((c) => c.slug);
  const nomes = categorias.map((c) => c.nome || c.slug.replace(/-/g, ' '));
  await client.query(
    `
    insert into public.categorias (slug, nome)
    select unnest($1::text[]), unnest($2::text[])
    on conflict (slug) do nothing
    `,
    [slugs, nomes]
  );
  console.log(`   ✅ categorias: ${categorias.length} slugs processados (ON CONFLICT DO NOTHING)`);
}

async function insertTagsBatched(client, tags) {
  if (!tags.length) return;
  let inserted = 0;
  for (let i = 0; i < tags.length; i += TAGS_INSERT_CHUNK) {
    const chunk = tags.slice(i, i + TAGS_INSERT_CHUNK);
    const slugs = chunk.map((t) => t.slug);
    const nomes = chunk.map((t) => t.nome || t.slug.replace(/-/g, ' '));
    await client.query(
      `
      insert into public.tags (slug, nome)
      select unnest($1::text[]), unnest($2::text[])
      on conflict (slug) do nothing
      `,
      [slugs, nomes]
    );
    inserted += chunk.length;
    if (inserted % 25000 === 0 || inserted === tags.length) {
      console.log(`   … tags: ${inserted.toLocaleString('pt-BR')} / ${tags.length.toLocaleString('pt-BR')}`);
    }
  }
  console.log(`   ✅ tags: ${tags.length.toLocaleString('pt-BR')} slugs processados`);
}

async function loadSlugMaps(client) {
  const [{ rows: catRows }, { rows: tagRows }] = await Promise.all([
    client.query('select id, slug from public.categorias'),
    client.query('select id, slug from public.tags'),
  ]);
  const categorias = new Map(catRows.map((r) => [r.slug, r.id]));
  const tags = new Map(tagRows.map((r) => [r.slug, r.id]));
  return { categorias, tags };
}

function mapRow(raw, categorias, tags) {
  const categoriaSlug = String(raw.categoria_slug || 'reflexao').toLowerCase();
  let categoriaId = categorias.get(categoriaSlug);
  if (categoriaId == null) {
    categoriaId = categorias.get('reflexao');
  }
  if (categoriaId == null) {
    throw new Error(`categoria_id ausente para slug "${categoriaSlug}"`);
  }

  const tagSlugs = Array.isArray(raw.tag_slugs) ? raw.tag_slugs : [];
  const tagsIds = [...new Set(tagSlugs.map((s) => tags.get(String(s).toLowerCase())).filter((id) => id != null))];

  const palavras = Array.isArray(raw.palavras_busca)
    ? raw.palavras_busca.map(String).slice(0, 12)
    : [];

  return {
    id: String(raw.id),
    slug: String(raw.slug).toLowerCase(),
    titulo: truncateTitulo(raw.titulo),
    categoria_id: categoriaId,
    tags_ids: tagsIds,
    autor_slug: raw.autor_slug ? String(raw.autor_slug) : null,
    shard: raw.shard ? String(raw.shard) : null,
    palavras_busca: palavras,
  };
}

async function insertFrasesIndexBatch(client, rows) {
  if (!rows.length) return;

  const placeholders = [];
  const params = [];
  let p = 1;

  for (const r of rows) {
    placeholders.push(
      `($${p++},$${p++},$${p++},$${p++},$${p++}::int[],$${p++},$${p++},$${p++}::text[])`
    );
    params.push(
      r.id,
      r.slug,
      r.titulo,
      r.categoria_id,
      r.tags_ids,
      r.autor_slug,
      r.shard,
      r.palavras_busca
    );
  }

  await client.query(
    `
    insert into public.frases_index (
      id, slug, titulo, categoria_id, tags_ids, autor_slug, shard, palavras_busca
    )
    values ${placeholders.join(',')}
    on conflict (id) do update set
      slug = excluded.slug,
      titulo = excluded.titulo,
      categoria_id = excluded.categoria_id,
      tags_ids = excluded.tags_ids,
      autor_slug = excluded.autor_slug,
      shard = excluded.shard,
      palavras_busca = excluded.palavras_busca
    `,
    params
  );
}

async function importIndexRows(client, manifest, categorias, tags) {
  const totalExpected = manifest.totalRows || 0;
  let buffer = [];
  let totalSent = 0;
  let batchNum = 0;

  for (const rel of manifest.batches) {
    const payload = readJson(rel);
    const rows = payload.rows || payload;
    if (!Array.isArray(rows)) {
      console.error('❌ Lote inválido (sem array rows):', rel);
      process.exit(1);
    }

    for (const raw of rows) {
      buffer.push(mapRow(raw, categorias, tags));
      if (buffer.length < BATCH_SIZE) continue;

      batchNum++;
      if (dryRun) {
        console.log(`   [dry-run] Lote ${batchNum} (${BATCH_SIZE} linhas)`);
      } else {
        await insertFrasesIndexBatch(client, buffer);
        totalSent += buffer.length;
        console.log(
          `   ✅ Lote ${batchNum} enviado com sucesso — Total: ${totalSent.toLocaleString('pt-BR')} / ${totalExpected.toLocaleString('pt-BR')}`
        );
      }
      buffer = [];
      if (dryRun && batchNum >= 1) return totalSent;
    }
  }

  if (buffer.length) {
    batchNum++;
    if (dryRun) {
      console.log(`   [dry-run] Lote final (${buffer.length} linhas)`);
    } else {
      await insertFrasesIndexBatch(client, buffer);
      totalSent += buffer.length;
      console.log(
        `   ✅ Lote ${batchNum} enviado com sucesso — Total: ${totalSent.toLocaleString('pt-BR')} / ${totalExpected.toLocaleString('pt-BR')}`
      );
    }
  }

  return totalSent;
}

async function main() {
  const manifest = readJson('manifest.json');
  if (!manifest.batches?.length) {
    console.error('❌ manifest.json sem batches');
    process.exit(1);
  }

  console.log('📦 Importação frases_index → Supabase (PostgreSQL pooler)');
  console.log(`   Origem: ${INDEX_DIR}`);
  console.log(`   Total esperado: ${(manifest.totalRows || 0).toLocaleString('pt-BR')} frases`);
  console.log(`   Lote: ${BATCH_SIZE.toLocaleString('pt-BR')} linhas\n`);

  if (dryRun) console.log('   Modo --dry-run (1 lote simulado)\n');

  const databaseUrl = await resolveDatabaseUrl();
  const client = createPgClient(databaseUrl);

  try {
    await client.connect();
    await assertTable(client, 'categorias');
    await assertTable(client, 'tags');
    await assertTable(client, 'frases_index');

    console.log('📂 Taxonomia…');
    const categoriasJson = readJson(manifest.taxonomia?.categorias || 'taxonomia/categorias.json');
    const tagsJson = readJson(manifest.taxonomia?.tags || 'taxonomia/tags.json');

    if (!dryRun) {
      await client.query('begin');
      await insertCategorias(client, categoriasJson);
      await insertTagsBatched(client, tagsJson);
      await client.query('commit');
    } else {
      console.log(`   [dry-run] categorias: ${categoriasJson.length}, tags: ${tagsJson.length}`);
    }

    const { categorias, tags } = dryRun
      ? {
          categorias: new Map(categoriasJson.map((c, i) => [c.slug, i + 1])),
          tags: new Map(tagsJson.slice(0, 5000).map((t, i) => [t.slug, i + 1])),
        }
      : await loadSlugMaps(client);

    console.log(
      `\n   Mapas: ${categorias.size.toLocaleString('pt-BR')} categorias · ${tags.size.toLocaleString('pt-BR')} tags\n`
    );
    console.log('📥 frases_index…');

    const totalSent = await importIndexRows(client, manifest, categorias, tags);

    if (!dryRun) {
      const { rows } = await client.query('select count(*)::int as n from public.frases_index');
      console.log(`\n✅ Importação concluída. frases_index: ${rows[0].n.toLocaleString('pt-BR')} linhas`);
    } else {
      console.log('\n✅ Dry-run OK. Rode sem --dry-run para importar.');
    }
  } catch (err) {
    await client.query('rollback').catch(() => {});
    console.error('\n❌ Falha:', (err?.message ?? String(err)).slice(0, 500));
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
