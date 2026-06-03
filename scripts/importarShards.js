/**
 * Importação local: shards JSON (data/import) → PostgreSQL (Supabase).
 *
 * Pré-requisito: npm install pg
 * Credencial: DATABASE_URL em .env.local (nunca commitar).
 *
 * Uso:
 *   node scripts/importarShards.js
 *   node scripts/importarShards.js --dry-run
 *   node scripts/importarShards.js --limit=1000
 *   node scripts/importarShards.js --file=meu-lote.json
 *   npm run supabase:config   (recomendado: só digitar senha e gravar .env.local)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ROOT,
  createPgClient,
  resolveDatabaseUrl,
} from '../setup-supabase/lib/connection.mjs';
import {
  buildSearchIndexRowsForPhrase,
  SEO_LOCALES as SEARCH_LOCALES,
} from '../lib/search/buildSearchIndexRow.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_DIR = path.join(ROOT, 'data', 'import');
const BATCH_SIZE = 500;

const SEO_LOCALES = new Set(['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi']);
const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : 0;
const fileArg = process.argv.find((a) => a.startsWith('--file='));
const FILE_FILTER = fileArg ? fileArg.split('=')[1] : null;

const SKIP_DIR_NAMES = new Set(['reports', 'logs', 'uploads']);
const SKIP_FILE_RE =
  /(?:state|report|slugs|audit|citei-batch|global-top|phase\d|\.done)\.json$/i;

const TABLE = 'public.frases';
const COLUMNS = [
  'id',
  'slug',
  'frase_original',
  'autor_original',
  'autor_slug',
  'categoria',
  'contextos',
  'palavras_chave',
  'explicacao',
  'ano_ou_data',
  'fontes',
  'observacao',
  'autor_tipo',
  'nacionalidade',
  'nascimento_falecimento',
  'language_original',
  'popularidade',
  'shard',
  'semantica',
  'seo',
  'informacoes',
];

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function optStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function uniqueStrings(arr) {
  return [...new Set((arr || []).map((s) => String(s).trim()).filter(Boolean))];
}

function normalizeLanguage(raw) {
  const lang = String(
    raw?.semantica?.idiomaOriginal ||
      raw?.semantica?.languageOriginal ||
      raw?.language_original ||
      'pt'
  )
    .toLowerCase()
    .slice(0, 2);
  return SEO_LOCALES.has(lang) ? lang : 'pt';
}

function rowFromRecord(raw, shardId) {
  const frase_original = String(raw.frase_original ?? raw.texto ?? '').trim();
  if (!frase_original) return null;

  const autor_original = String(raw.autor_original ?? raw.autor ?? 'Anônimo').trim() || 'Anônimo';
  let slug = slugify(raw.slug || frase_original.slice(0, 80));
  if (!slug) slug = slugify(raw.id || 'frase');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) slug = slugify(raw.id || 'frase') || 'frase';

  const palavras_chave = uniqueStrings(
    raw.palavras_chave ?? raw.palavrasChave ?? raw.semantica?.palavrasChave ?? raw.tags ?? []
  ).map((t) => slugify(t)).filter(Boolean);

  const categoria = slugify(raw.categoria || raw.semantica?.categoriaPrincipal || palavras_chave[0] || 'reflexao') || 'reflexao';
  const contextos = uniqueStrings(
    raw.contextos ?? raw.semantica?.contextos ?? palavras_chave.slice(1)
  )
    .map((c) => slugify(c))
    .filter(Boolean);

  const semantica = raw.semantica && typeof raw.semantica === 'object' ? raw.semantica : {};
  const seo = raw.seo && typeof raw.seo === 'object' ? raw.seo : {};
  const informacoes = {
    ultima_atualizacao:
      optStr(raw.informacoes?.ultima_atualizacao) ||
      optStr(semantica.ultimaAtualizacao) ||
      null,
    confiabilidade: optStr(raw.informacoes?.confiabilidade) || null,
    ...(raw.informacoes && typeof raw.informacoes === 'object' ? raw.informacoes : {}),
  };

  const id = optStr(raw.id) || `f_${slug}`;

  return {
    id,
    slug,
    frase_original,
    autor_original,
    autor_slug: optStr(raw.autor_slug ?? raw.autorSlug),
    categoria,
    contextos: contextos.length ? contextos : ['reflexao'],
    palavras_chave: palavras_chave.length ? palavras_chave : [categoria],
    explicacao: String(raw.explicacao ?? '').trim(),
    ano_ou_data: optStr(raw.ano_ou_data ?? raw.semantica?.ano),
    fontes: optStr(raw.fontes ?? raw.semantica?.fonte),
    observacao: optStr(raw.observacao),
    autor_tipo: optStr(raw.autor_tipo ?? raw.semantica?.tipoAutor),
    nacionalidade: optStr(raw.nacionalidade ?? raw.semantica?.nacionalidadeAutor),
    nascimento_falecimento: optStr(
      raw.nascimento_falecimento ??
        [raw.semantica?.nascimentoAutor, raw.semantica?.falecimentoAutor].filter(Boolean).join(' – ')
    ),
    language_original: normalizeLanguage(raw),
    popularidade: Number.isFinite(raw.popularidade)
      ? Math.trunc(raw.popularidade)
      : Number.isFinite(raw.semantica?.popularidade)
        ? Math.trunc(raw.semantica.popularidade)
        : 0,
    shard: shardId,
    semantica,
    seo,
    informacoes,
  };
}

function* walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      yield* walkJsonFiles(full);
      continue;
    }
    if (!entry.name.endsWith('.json')) continue;
    if (SKIP_FILE_RE.test(entry.name)) continue;
    if (FILE_FILTER && entry.name !== FILE_FILTER && !full.includes(FILE_FILTER)) continue;
    yield full;
  }
}

function shardIdFromPath(filePath) {
  const base = path.basename(filePath, '.json');
  if (base.startsWith('shard-')) return base.replace('shard-', '');
  return base;
}

function loadRecordsFromFile(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn(`⚠️ Ignorando ${filePath}: ${e.message}`);
    return [];
  }

  const shardId = shardIdFromPath(filePath);
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.frases)
      ? parsed.frases
      : Array.isArray(parsed?.items)
        ? parsed.items
        : null;

  if (!list) {
    console.warn(`⚠️ Sem array de frases em ${filePath}`);
    return [];
  }

  const rows = [];
  for (const raw of list) {
    const row = rowFromRecord(raw, shardId);
    if (row) rows.push(row);
  }
  return rows;
}

function flattenValues(rows) {
  const params = [];
  for (const row of rows) {
    params.push(
      row.id,
      row.slug,
      row.frase_original,
      row.autor_original,
      row.autor_slug,
      row.categoria,
      row.contextos,
      row.palavras_chave,
      row.explicacao,
      row.ano_ou_data,
      row.fontes,
      row.observacao,
      row.autor_tipo,
      row.nacionalidade,
      row.nascimento_falecimento,
      row.language_original,
      row.popularidade,
      row.shard,
      JSON.stringify(row.semantica),
      JSON.stringify(row.seo),
      JSON.stringify(row.informacoes)
    );
  }
  return params;
}

function buildUpsertSql(rowCount) {
  const cols = COLUMNS.join(', ');
  const valueGroups = [];
  let n = 1;
  for (let r = 0; r < rowCount; r++) {
    const placeholders = COLUMNS.map(() => `$${n++}`).join(', ');
    valueGroups.push(`(${placeholders})`);
  }
  const updates = COLUMNS.filter((c) => c !== 'id')
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  return {
    text: `INSERT INTO ${TABLE} (${cols}) VALUES ${valueGroups.join(', ')}
      ON CONFLICT (id) DO UPDATE SET ${updates}`,
    values: [],
  };
}

async function indexSearchBatch(client, rows) {
  if (!rows.length) return;
  const ids = rows.map((r) => r.id);
  const { rows: indexed } = await client.query(
    'select id from public.frases_index where id = any($1::text[])',
    [ids]
  );
  const allowed = new Set(indexed.map((r) => r.id));
  if (!allowed.size) return;

  const flat = [];
  for (const row of rows) {
    if (!allowed.has(row.id)) continue;
    const lang = SEARCH_LOCALES.includes(row.language_original) ? row.language_original : 'pt';
    flat.push(
      ...buildSearchIndexRowsForPhrase({
        fraseId: row.id,
        languageOriginal: lang,
        originalText: row.frase_original,
        autor: row.autor_original,
        categoria: row.categoria,
        tags: row.contextos || [],
        palavrasChave: row.palavras_chave || [],
        translations: [],
      })
    );
  }
  if (!flat.length) return;

  await client.query(
    `
    insert into public.frase_search_index (frase_id, language, search_text, keywords)
    select * from unnest($1::text[], $2::text[], $3::text[], $4::text[][])
    as t(frase_id, language, search_text, keywords)
    on conflict (frase_id, language) do update set
      search_text = excluded.search_text,
      keywords = excluded.keywords,
      updated_at = timezone('utc', now())
    `,
    [
      flat.map((r) => r.frase_id),
      flat.map((r) => r.language),
      flat.map((r) => r.search_text),
      flat.map((r) => r.keywords),
    ]
  );
}

async function insertBatch(client, rows, batchIndex, totalBatches) {
  if (!rows.length) return { ok: 0, err: 0 };

  if (DRY_RUN) {
    console.log(`✅ Lote ${batchIndex}/${totalBatches} [dry-run] — ${rows.length} frase(s) simuladas`);
    return { ok: rows.length, err: 0 };
  }

  const sql = buildUpsertSql(rows.length);
  sql.values = flattenValues(rows);

  try {
    await client.query(sql);
    try {
      await indexSearchBatch(client, rows);
    } catch (indexErr) {
      console.warn(
        `⚠️ Lote ${batchIndex}: frase_search_index não atualizado:`,
        indexErr?.message?.slice(0, 120) ?? indexErr
      );
    }
    console.log(`✅ Lote ${batchIndex}/${totalBatches} enviado com sucesso (${rows.length} frase(s))`);
    return { ok: rows.length, err: 0 };
  } catch (err) {
    console.error(
      `❌ Lote ${batchIndex}/${totalBatches} falhou:`,
      err?.message?.slice(0, 300) ?? err
    );
    return { ok: 0, err: rows.length };
  }
}

async function main() {
  const databaseUrl = await resolveDatabaseUrl();

  if (!fs.existsSync(IMPORT_DIR)) {
    console.error(`❌ Pasta não encontrada: ${IMPORT_DIR}`);
    process.exit(1);
  }

  const byId = new Map();
  let filesRead = 0;

  for (const filePath of walkJsonFiles(IMPORT_DIR)) {
    filesRead += 1;
    const rows = loadRecordsFromFile(filePath);
    for (const row of rows) {
      byId.set(row.id, row);
      if (LIMIT > 0 && byId.size >= LIMIT) break;
    }
    if (LIMIT > 0 && byId.size >= LIMIT) break;
  }

  const allRows = [...byId.values()];
  console.log(`📦 ${allRows.length} frase(s) únicas de ${filesRead} arquivo(s) JSON em data/import/`);

  if (!allRows.length) {
    console.error(
      '❌ Nenhuma frase encontrada. Coloque shards JSON (array de objetos) em data/import/ ou use --file=nome.json'
    );
    process.exit(1);
  }

  const batches = [];
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    batches.push(allRows.slice(i, i + BATCH_SIZE));
  }
  const totalBatches = batches.length;
  console.log(`🚀 Iniciando envio em ${totalBatches} lote(s) de até ${BATCH_SIZE} registros…`);

  if (DRY_RUN) {
    let ok = 0;
    for (let i = 0; i < batches.length; i++) {
      const r = await insertBatch(null, batches[i], i + 1, totalBatches);
      ok += r.ok;
    }
    console.log(`✅ Concluído [dry-run]: ${ok} frase(s)`);
    return;
  }

  const client = createPgClient(databaseUrl);

  try {
    await client.connect();
    console.log('🔌 Conectado ao PostgreSQL');

    let ok = 0;
    let err = 0;
    for (let i = 0; i < batches.length; i++) {
      const r = await insertBatch(client, batches[i], i + 1, totalBatches);
      ok += r.ok;
      err += r.err;
    }

    console.log(`✅ Importação finalizada: ${ok} ok, ${err} erro(s)`);
    if (err > 0) process.exit(1);
  } catch (e) {
    console.error('❌ Erro de conexão:', e?.message ?? e);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error('❌', e?.message ?? e);
  process.exit(1);
});
