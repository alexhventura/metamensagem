#!/usr/bin/env node
/**
 * Gera payload leve para importação em frases_index (Supabase).
 * Fonte: public/frases-v2/index/*.json (rápido) + detail/*.json (tags e título).
 *
 * Saída (não commitar data/search-index/ em massa):
 *   data/search-index/taxonomia/categorias.json
 *   data/search-index/taxonomia/tags.json
 *   data/search-index/batches/batch-NNNN.json
 *   data/search-index/manifest.json
 *
 * Uso:
 *   node scripts/gerarIndiceBusca.js
 *   node scripts/gerarIndiceBusca.js --skip-detail   # só index shards (sem tags do detail)
 *   node scripts/gerarIndiceBusca.js --batch-size 5000 --max-batches 2  # amostra
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FRASES_V2 = path.join(ROOT, 'public', 'frases-v2');
const OUT_DIR = path.join(ROOT, 'data', 'search-index');
const TITULO_MAX = 160;
const PALAVRAS_MAX = 12;
const DEFAULT_BATCH = 8000;

const args = process.argv.slice(2);
const skipDetail = args.includes('--skip-detail');
const batchSize = Number(args.find((a) => a.startsWith('--batch-size='))?.split('=')[1]) || DEFAULT_BATCH;
const maxBatches = Number(args.find((a) => a.startsWith('--max-batches='))?.split('=')[1]) || 0;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function tituloFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .slice(0, 18)
    .join(' ')
    .slice(0, TITULO_MAX);
}

function truncateTitulo(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length <= TITULO_MAX ? t : `${t.slice(0, TITULO_MAX - 1)}…`;
}

function uniqSlugs(list) {
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const s = slugify(raw);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function collectPalavrasBusca({ titulo, tagSlugs, categoriaSlug }) {
  const terms = [];
  const push = (w) => {
    const s = slugify(w).replace(/-/g, ' ');
    if (s && s.length >= 2 && !terms.includes(s)) terms.push(s);
  };
  titulo
    .toLowerCase()
    .split(/\s+/)
    .slice(0, 8)
    .forEach(push);
  for (const t of tagSlugs) push(t.replace(/-/g, ' '));
  push(categoriaSlug);
  return terms.slice(0, PALAVRAS_MAX);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data)}\n`, 'utf8');
}

function loadManifest() {
  const manifestPath = path.join(FRASES_V2, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json não encontrado em public/frases-v2/');
    process.exit(1);
  }
  return readJson(manifestPath);
}

/** Mapa id → enriquecimento a partir dos detail shards */
function buildDetailEnrichment(manifest) {
  const byId = new Map();
  if (skipDetail) return byId;

  const detailShards = manifest.detailShards || [];
  console.log(`📚 Lendo ${detailShards.length} detail shards (tags + título)…`);

  for (let i = 0; i < detailShards.length; i++) {
    const rel = detailShards[i];
    const filePath = path.join(FRASES_V2, rel);
    if (!fs.existsSync(filePath)) continue;
    const rows = readJson(filePath);
    for (const row of rows) {
      const id = row.id;
      if (!id) continue;
      const texto = (row.frase_original || row.texto || '').trim();
      const contextos = Array.isArray(row.contextos) ? row.contextos : [];
      const palavras = Array.isArray(row.palavras_chave) ? row.palavras_chave : [];
      const tags = uniqSlugs([
        row.categoria,
        ...contextos,
        ...palavras,
        ...(Array.isArray(row.tags) ? row.tags : []),
      ]);
      byId.set(id, {
        titulo: truncateTitulo(texto) || tituloFromSlug(row.slug || ''),
        tagSlugs: tags.filter((t) => t !== slugify(row.categoria)),
      });
    }
    if ((i + 1) % 32 === 0) console.log(`   … ${i + 1}/${detailShards.length} detail shards`);
  }

  return byId;
}

function main() {
  const manifest = loadManifest();
  const indexShards = manifest.shards || [];
  if (!indexShards.length) {
    console.error('❌ manifest.shards vazio');
    process.exit(1);
  }

  console.log('🔍 MetaMensagem — gerar índice de busca (híbrido)');
  console.log(`   Index shards: ${indexShards.length}`);
  console.log(`   skip-detail: ${skipDetail}`);

  const detailById = buildDetailEnrichment(manifest);

  const categoriasMap = new Map();
  const tagsMap = new Map();
  const rows = [];

  for (const rel of indexShards) {
    const filePath = path.join(FRASES_V2, rel);
    if (!fs.existsSync(filePath)) {
      console.warn('⚠️ ausente:', rel);
      continue;
    }
    const list = readJson(filePath);
    for (const item of list) {
      const id = item.id;
      const slug = slugify(item.slug);
      if (!id || !slug) continue;

      const categoriaSlug = slugify(item.categoriaPrincipal || 'reflexao') || 'reflexao';
      categoriasMap.set(categoriaSlug, {
        slug: categoriaSlug,
        nome: categoriaSlug.replace(/-/g, ' '),
      });

      const enrich = detailById.get(id);
      const titulo =
        enrich?.titulo || truncateTitulo(tituloFromSlug(slug)) || slug.slice(0, TITULO_MAX);

      const tagSlugs = uniqSlugs([
        ...(enrich?.tagSlugs || []),
        ...slug.split('-').filter((p) => p.length >= 4).slice(0, 4),
      ]).filter((t) => t !== categoriaSlug);

      for (const t of tagSlugs) {
        tagsMap.set(t, { slug: t, nome: t.replace(/-/g, ' ') });
      }

      rows.push({
        id,
        slug,
        titulo,
        categoria_slug: categoriaSlug,
        tag_slugs: tagSlugs,
        palavras_busca: collectPalavrasBusca({ titulo, tagSlugs, categoriaSlug }),
        autor_slug: item.autorSlug ? slugify(item.autorSlug) : null,
        shard: item.shard || null,
      });
    }
  }

  console.log(`✅ ${rows.length} entradas de índice`);
  console.log(`   ${categoriasMap.size} categorias · ${tagsMap.size} tags`);

  ensureDir(OUT_DIR);
  writeJson(path.join(OUT_DIR, 'taxonomia', 'categorias.json'), [...categoriasMap.values()]);
  writeJson(path.join(OUT_DIR, 'taxonomia', 'tags.json'), [...tagsMap.values()]);

  const batchesDir = path.join(OUT_DIR, 'batches');
  ensureDir(batchesDir);

  const batchFiles = [];
  let batchIndex = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    if (maxBatches > 0 && batchIndex >= maxBatches) break;
    const chunk = rows.slice(i, i + batchSize);
    const name = `batch-${String(batchIndex).padStart(4, '0')}.json`;
    writeJson(path.join(batchesDir, name), {
      version: 1,
      rows: chunk,
    });
    batchFiles.push(`batches/${name}`);
    batchIndex++;
  }

  const manifestOut = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    batchSize,
    batches: batchFiles,
    taxonomia: {
      categorias: 'taxonomia/categorias.json',
      tags: 'taxonomia/tags.json',
    },
    importHint:
      'Importar taxonomia primeiro, mapear slugs→ids, depois upsert em frases_index (service_role).',
  };
  writeJson(path.join(OUT_DIR, 'manifest.json'), manifestOut);

  console.log(`📦 ${batchFiles.length} lotes em data/search-index/batches/`);
  console.log('   Próximo passo (manual): aplicar migração SQL e script de import em lote.');
}

main();
