#!/usr/bin/env node
/**
 * Backfill incremental de frase_search_index (apenas idiomas existentes por frase).
 *
 * ⚠️ NÃO rode backfill completo (--mode=full) enquanto o DB estiver ≥ ~500 MB.
 *    frase_search_index ~1 KB/linha × ~467k frases ≈ +500 MB — estoura o free tier.
 *    Use popular / on-demand / combined (padrão seguro).
 *
 * Modos:
 *   --mode=popular     top N por frases_index.popularidade (padrão, --top=10000)
 *   --mode=on-demand   fila translation_requests, traduções recentes, métricas, get_top_frases
 *   --mode=combined    popular ∪ on-demand (recomendado para cron)
 *   --mode=full        varre todas as frases_index (legado; exige confirmação explícita)
 *
 * Uso:
 *   npm run frases:search-index:backfill
 *   node scripts/backfillFraseSearchIndex.mjs --dry-run
 *   node scripts/backfillFraseSearchIndex.mjs --mode=combined --top=10000
 *   node scripts/backfillFraseSearchIndex.mjs --mode=on-demand --limit=500
 *   node scripts/backfillFraseSearchIndex.mjs --mode=full --i-understand-storage-risk
 *   node scripts/backfillFraseSearchIndex.mjs --source=shards --mode=full --i-understand-storage-risk
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
const skipDetail = args.includes('--skip-detail');
const fullAck = args.includes('--i-understand-storage-risk');

const modeArg = args.find((a) => a.startsWith('--mode='));
const MODE = modeArg?.split('=')[1] || 'popular';

const sourceArg = args.find((a) => a.startsWith('--source='));
const SOURCE = sourceArg?.split('=')[1] || 'db';

const batchSize =
  Number(args.find((a) => a.startsWith('--batch-size='))?.split('=')[1]) || 1500;
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || 0;
const offset = Number(args.find((a) => a.startsWith('--offset='))?.split('=')[1]) || 0;
const topN = Number(args.find((a) => a.startsWith('--top='))?.split('=')[1]) || 10000;
const demandDays =
  Number(args.find((a) => a.startsWith('--demand-days='))?.split('=')[1]) || 90;
const topFrasesLimit =
  Number(args.find((a) => a.startsWith('--top-frases='))?.split('=')[1]) || 200;

const VALID_MODES = new Set(['popular', 'on-demand', 'combined', 'full']);

async function regclass(client, name) {
  const { rows } = await client.query('select to_regclass($1)::text as reg', [`public.${name}`]);
  return rows[0]?.reg === name;
}

async function assertTable(client, name) {
  if (!(await regclass(client, name))) {
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

async function fetchIndexRowsForIds(client, ids) {
  if (!ids.length) return [];
  const { rows } = await client.query(
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
    where fi.id = any($1::text[])
    order by fi.popularidade desc, fi.id
    `,
    [ids]
  );
  return rows;
}

function buildFlatRows(indexRows, translationsMap) {
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
  return flatRows;
}

async function indexFraseIds(client, fraseIds, dbUrl) {
  let processed = 0;
  let upserted = 0;
  let pg = client;

  const reconnect = async () => {
    try {
      await pg.end();
    } catch {
      /* ignore */
    }
    pg = createPgClient(dbUrl);
    await pg.connect();
    return pg;
  };

  for (let i = 0; i < fraseIds.length; ) {
    if (limit > 0 && processed >= limit) break;

    const chunkSize =
      limit > 0 ? Math.min(batchSize, limit - processed) : batchSize;
    const slice = fraseIds.slice(i, i + chunkSize);
    i += slice.length;
    if (!slice.length) break;

    let indexRows;
    try {
      indexRows = await fetchIndexRowsForIds(pg, slice);
    } catch (err) {
      console.warn(`   ⚠️ reconectando após erro na leitura:`, err.message);
      pg = await reconnect();
      i -= slice.length;
      continue;
    }

    let translationsMap;
    try {
      translationsMap = await loadTranslationsMap(pg, slice);
    } catch (err) {
      console.warn(`   ⚠️ reconectando após erro nas traduções:`, err.message);
      pg = await reconnect();
      i -= slice.length;
      continue;
    }

    const flatRows = buildFlatRows(indexRows, translationsMap);

    if (!dryRun && flatRows.length) {
      try {
        await upsertBatch(pg, flatRows);
      } catch (err) {
        console.warn(`   ⚠️ reconectando após erro no upsert:`, err.message);
        pg = await reconnect();
        i -= slice.length;
        continue;
      }
    }

    processed += slice.length;
    upserted += flatRows.length;
    console.log(
      `   … ${processed.toLocaleString('pt-BR')} / ${fraseIds.length.toLocaleString('pt-BR')} frases · ${upserted.toLocaleString('pt-BR')} linhas índice`
    );
  }

  return { processed, upserted, client: pg };
}

async function resolvePopularIds(client) {
  const { rows } = await client.query(
    `
    select id
    from public.frases_index
    order by popularidade desc, id
    limit $1 offset $2
    `,
    [topN, offset]
  );
  return rows.map((r) => r.id);
}

async function resolveOnDemandIds(client) {
  const ids = new Set();
  let sources = 0;

  if (await regclass(client, 'translation_requests')) {
    const { rows } = await client.query(
      `select distinct frase_id as id from public.translation_requests where frase_id is not null`
    );
    for (const r of rows) if (r.id) ids.add(r.id);
    sources += 1;
  }

  if (await regclass(client, 'frases_traducoes')) {
    const { rows } = await client.query(
      `
      select distinct frase_id as id
      from public.frases_traducoes
      where is_official = true
        and frase_id is not null
        and updated_at >= timezone('utc', now()) - ($1::int * interval '1 day')
      `,
      [demandDays]
    );
    for (const r of rows) if (r.id) ids.add(r.id);
    sources += 1;
  }

  if (await regclass(client, 'frase_metrics')) {
    const { rows } = await client.query(
      `
      select frase_id as id
      from public.frase_metrics
      where (views + search_hits + shares + translation_requests) > 0
      `
    );
    for (const r of rows) if (r.id) ids.add(r.id);
    sources += 1;
  }

  if (await regclass(client, 'frase_metrics_daily')) {
    const { rows } = await client.query(
      `
      select distinct frase_id as id
      from public.frase_metrics_daily
      where metric_date >= (timezone('utc', now())::date - $1::int)
        and (views + search_hits + shares + translation_requests) > 0
      `,
      [Math.min(demandDays, 90)]
    );
    for (const r of rows) if (r.id) ids.add(r.id);
    sources += 1;
  }

  const { rows: fnRows } = await client.query(`
    select exists (
      select 1 from pg_proc pr
      join pg_namespace n on n.oid = pr.pronamespace
      where n.nspname = 'public' and pr.proname = 'get_top_frases'
    ) as ok
  `);
  if (fnRows[0]?.ok) {
    for (const periodo of ['semana', 'geral']) {
      const { rows } = await client.query(
        `select id from public.get_top_frases($1, $2)`,
        [periodo, topFrasesLimit]
      );
      for (const r of rows) if (r.id) ids.add(r.id);
    }
    sources += 1;
  }

  if (!sources) {
    console.warn('   ⚠️ Nenhuma fonte on-demand disponível (migrações em falta?)');
    return [];
  }

  return [...ids].sort();
}

async function resolveTargetIds(client, mode) {
  if (mode === 'popular') {
    return resolvePopularIds(client);
  }
  if (mode === 'on-demand') {
    return resolveOnDemandIds(client);
  }
  if (mode === 'combined') {
    const [popular, demand] = await Promise.all([
      resolvePopularIds(client),
      resolveOnDemandIds(client),
    ]);
    const seen = new Set(popular);
    const merged = [...popular];
    for (const id of demand) {
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(id);
      }
    }
    return merged;
  }
  return [];
}

function sliceIds(ids) {
  let list = ids;
  if (offset > 0) list = list.slice(offset);
  if (limit > 0) list = list.slice(0, limit);
  return list;
}

function warnFullBackfill() {
  console.error(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  AVISO: --mode=full varre TODAS as frases_index (~467k linhas).              ║
║  Projeção frase_search_index: ~500 MB adicionais — NÃO use no free tier      ║
║  até o DB total ficar confortavelmente abaixo de 500 MB.                    ║
║                                                                              ║
║  Repita com --i-understand-storage-risk se realmente precisar do legado.     ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
}

async function backfillFromDbFull(client, dbUrl) {
  await assertTable(client, 'frases_index');
  await assertTable(client, 'frase_search_index');

  const { rows: countRows } = await client.query(
    'select count(*)::int as n from public.frases_index'
  );
  const total = countRows[0]?.n || 0;
  console.log(`📊 frases_index: ${total.toLocaleString('pt-BR')} frases (scan completo)`);

  let processed = 0;
  let upserted = 0;
  let cursor = offset;
  let pg = client;

  const reconnect = async () => {
    try {
      await pg.end();
    } catch {
      /* ignore */
    }
    pg = createPgClient(dbUrl);
    await pg.connect();
    return pg;
  };

  while (true) {
    if (limit > 0 && processed >= limit) break;

    const pageSize = limit > 0 ? Math.min(batchSize, limit - processed) : batchSize;

    let indexRows;
    try {
      ({ rows: indexRows } = await pg.query(
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
      ));
    } catch (err) {
      console.warn(`   ⚠️ reconectando após erro na leitura (offset ${cursor}):`, err.message);
      pg = await reconnect();
      continue;
    }

    if (!indexRows.length) break;

    const ids = indexRows.map((r) => r.id);
    let translationsMap;
    try {
      translationsMap = await loadTranslationsMap(pg, ids);
    } catch (err) {
      console.warn(`   ⚠️ reconectando após erro nas traduções:`, err.message);
      pg = await reconnect();
      continue;
    }

    const flatRows = buildFlatRows(indexRows, translationsMap);

    if (!dryRun && flatRows.length) {
      try {
        await upsertBatch(pg, flatRows);
      } catch (err) {
        console.warn(`   ⚠️ reconectando após erro no upsert:`, err.message);
        pg = await reconnect();
        continue;
      }
    }

    processed += indexRows.length;
    upserted += flatRows.length;
    cursor += indexRows.length;

    console.log(
      `   … ${processed.toLocaleString('pt-BR')} frases · ${upserted.toLocaleString('pt-BR')} linhas índice`
    );

    if (indexRows.length < pageSize) break;
  }

  return { processed, upserted, client: pg };
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
  if (!VALID_MODES.has(MODE)) {
    console.error(`❌ --mode inválido: ${MODE}. Use: popular | on-demand | combined | full`);
    process.exit(1);
  }

  if (MODE === 'full' && !fullAck) {
    warnFullBackfill();
    process.exit(1);
  }

  if (SOURCE === 'shards' && MODE !== 'full') {
    console.error('❌ --source=shards só é suportado com --mode=full');
    process.exit(1);
  }

  console.log('🔍 Backfill frase_search_index (multilíngue democrático)');
  console.log(`   mode=${MODE} source=${SOURCE} batch=${batchSize} dry-run=${dryRun}`);
  if (MODE === 'popular' || MODE === 'combined') console.log(`   top=${topN}`);
  if (MODE === 'on-demand' || MODE === 'combined') {
    console.log(`   demand-days=${demandDays} top-frases=${topFrasesLimit}`);
  }
  if (limit) console.log(`   limit=${limit} offset=${offset}`);

  if (MODE === 'full') {
    console.warn(
      '⚠️  FULL BACKFILL ativo — confirme que o DB está < 500 MB antes de gravar sem --dry-run.'
    );
  }

  const dbUrl = await resolveDatabaseUrl();
  if (!dbUrl) {
    console.error('❌ DATABASE_URL ausente (.env.local ou .env.scripts.local)');
    process.exit(1);
  }

  const client = createPgClient(dbUrl);
  await client.connect();

  try {
    let result;

    if (SOURCE === 'shards') {
      result = await backfillFromShards(client);
    } else if (MODE === 'full') {
      result = await backfillFromDbFull(client, dbUrl);
    } else {
      await assertTable(client, 'frases_index');
      await assertTable(client, 'frase_search_index');

      const rawIds = await resolveTargetIds(client, MODE);
      const fraseIds = sliceIds(rawIds);
      console.log(
        `📋 Alvo: ${fraseIds.length.toLocaleString('pt-BR')} frases` +
          (MODE === 'combined'
            ? ` (top ${topN} popular + demanda, união ${rawIds.length.toLocaleString('pt-BR')})`
            : '')
      );

      if (!fraseIds.length) {
        console.log('   Nada a indexar.');
        result = { processed: 0, upserted: 0, client };
      } else {
        result = await indexFraseIds(client, fraseIds, dbUrl);
      }
    }

    const activeClient = result.client ?? client;
    const { rows } = await activeClient.query(
      'select count(*)::int as n from public.frase_search_index'
    );
    console.log(
      `\n✅ Concluído: ${result.processed.toLocaleString('pt-BR')} frases processadas, ` +
        `${result.upserted.toLocaleString('pt-BR')} linhas upsertadas` +
        (dryRun ? ' (dry-run — nada gravado)' : '')
    );
    console.log(`   frase_search_index total: ${rows[0]?.n?.toLocaleString('pt-BR') ?? 0}`);
    await activeClient.end();
  } catch (err) {
    await client.end().catch(() => {});
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
