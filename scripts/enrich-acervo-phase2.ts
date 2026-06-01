/**
 * Fase 2 — enriquecimento semântico + SEO + shards (custo zero, heurísticas).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { FraseCanonical } from '../lib/frases/canonical';
import { enrichFraseRecord, shardForSlug, toIndexLite } from '../lib/enrichment/enrichFrase';
import type { FraseEnriquecida, FraseIndexLite } from '../lib/enrichment/types';
import { WriteQueue, atomicWriteFile } from '../lib/importers/shared/writeQueue';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'frases');
const OUT_DIR = path.join(ROOT, 'public', 'frases-v2');
const REPORT_PATH = path.join(ROOT, 'data', 'import', 'reports', 'phase2-enrichment.json');
const STATE_PATH = path.join(ROOT, 'data', 'import', 'phase2-state.json');

const args = process.argv.slice(2);
const limitAuthors = args.includes('--limit')
  ? parseInt(args[args.indexOf('--limit') + 1], 10)
  : 0;
const resume = args.includes('--resume');
const FLUSH_EVERY = 500;
const writeQueue = new WriteQueue(2);

function sleepMs(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync wait */
  }
}

function atomicWrite(filePath: string, data: unknown, pretty = false) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const body = (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + (pretty ? '\n' : '');
  const tmp = path.join(dir, `._tmp_${path.basename(filePath)}_${process.pid}`);
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      fs.writeFileSync(tmp, body, 'utf8');
      if (fs.existsSync(filePath)) {
        try {
          fs.renameSync(tmp, filePath);
        } catch {
          fs.copyFileSync(tmp, filePath);
          try {
            fs.unlinkSync(tmp);
          } catch {
            /* ignore */
          }
        }
      } else {
        fs.renameSync(tmp, filePath);
      }
      return;
    } catch (e) {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      if (attempt === 7) throw e;
      sleepMs(150 * (attempt + 1));
    }
  }
}

function listAuthorFiles() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((n) => n.endsWith('.json') && n !== 'frases.json')
    .sort()
    .map((n) => path.join(CONTENT_DIR, n));
}

function isAlreadyEnriched(arr: FraseCanonical[]): boolean {
  const f = arr[0] as FraseEnriquecida | undefined;
  return Boolean(f?.informacoes?.enriquecimento_fase2);
}

function ingestEnriched(
  e: FraseEnriquecida,
  shards: Map<string, { index: FraseIndexLite[]; detail: FraseEnriquecida[] }>,
  stats: {
    autoresMap: Map<string, { slug: string; nome: string; count: number; tipo: string | null; nacionalidade: string | null }>;
    catMap: Map<string, number>;
    ctxMap: Map<string, number>;
    emoMap: Map<string, number>;
    temaMap: Map<string, number>;
    kwMap: Map<string, number>;
    seoEntries: { slug: string; titleSeo: string; descriptionSeo: string; keywordsSeo: string[] }[];
    autoresEnriquecidos: Set<string>;
  }
) {
  const shard = shardForSlug(e.slug);
  shards.get(shard)!.index.push(toIndexLite(e));
  shards.get(shard)!.detail.push(e);
  stats.catMap.set(e.semantica.categoriaPrincipal, (stats.catMap.get(e.semantica.categoriaPrincipal) || 0) + 1);
  for (const c of e.semantica.categorias) stats.catMap.set(c, (stats.catMap.get(c) || 0) + 1);
  for (const c of e.semantica.contextos) stats.ctxMap.set(c, (stats.ctxMap.get(c) || 0) + 1);
  for (const em of e.semantica.emocoes) stats.emoMap.set(em, (stats.emoMap.get(em) || 0) + 1);
  for (const t of e.semantica.temas) stats.temaMap.set(t, (stats.temaMap.get(t) || 0) + 1);
  for (const k of e.semantica.palavrasChave) stats.kwMap.set(k, (stats.kwMap.get(k) || 0) + 1);
  if (e.semantica.biografiaAutorCurta) stats.autoresEnriquecidos.add(e.autorSlug);
  const prev = stats.autoresMap.get(e.autorSlug);
  stats.autoresMap.set(e.autorSlug, {
    slug: e.autorSlug,
    nome: e.autor,
    count: (prev?.count || 0) + 1,
    tipo: e.semantica.tipoAutor,
    nacionalidade: e.semantica.nacionalidadeAutor,
  });
  if (stats.seoEntries.length < 50000) {
    stats.seoEntries.push({
      slug: e.slug,
      titleSeo: e.seo.titleSeo,
      descriptionSeo: e.seo.descriptionSeo,
      keywordsSeo: e.seo.keywordsSeo,
    });
  }
}

function flushShardsToDisk(shards: Map<string, { index: FraseIndexLite[]; detail: FraseEnriquecida[] }>) {
  fs.mkdirSync(path.join(OUT_DIR, 'index'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'detail'), { recursive: true });
  for (const [key, data] of shards) {
    if (!data.detail.length) continue;
    const detailPath = path.join(OUT_DIR, 'detail', `shard-${key}.json`);
    const indexPath = path.join(OUT_DIR, 'index', `shard-${key}.json`);
    let existing: FraseEnriquecida[] = [];
    if (fs.existsSync(detailPath)) {
      existing = JSON.parse(fs.readFileSync(detailPath, 'utf8')) as FraseEnriquecida[];
    }
    const bySlug = new Map(existing.map((f) => [f.slug, f]));
    for (const f of data.detail) bySlug.set(f.slug, f);
    const merged = [...bySlug.values()];
    atomicWrite(detailPath, merged);
    atomicWrite(
      indexPath,
      merged.map((f) => toIndexLite(f))
    );
    data.detail = [];
    data.index = [];
  }
}

function saveState(state: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  atomicWrite(STATE_PATH, state, true);
}

function loadState(): Record<string, unknown> | null {
  if (!fs.existsSync(STATE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function main() {
  const files = listAuthorFiles();
  const maxFiles = limitAuthors > 0 ? files.slice(0, limitAuthors) : files;

  const shards = new Map<string, { index: FraseIndexLite[]; detail: FraseEnriquecida[] }>();
  for (let i = 0; i < 256; i++) {
    const k = i.toString(16).padStart(2, '0');
    shards.set(k, { index: [], detail: [] });
  }

  const autoresMap = new Map<
    string,
    { slug: string; nome: string; count: number; tipo: string | null; nacionalidade: string | null }
  >();
  const catMap = new Map<string, number>();
  const ctxMap = new Map<string, number>();
  const emoMap = new Map<string, number>();
  const temaMap = new Map<string, number>();
  const kwMap = new Map<string, number>();
  const seoEntries: { slug: string; titleSeo: string; descriptionSeo: string; keywordsSeo: string[] }[] = [];

  let processed = 0;
  let explicacoesReescritas = 0;
  const autoresEnriquecidos = new Set<string>();
  const feedReservoir: FraseEnriquecida[] = [];
  const FEED_TARGET = 4000;
  const stats = { autoresMap, catMap, ctxMap, emoMap, temaMap, kwMap, seoEntries, autoresEnriquecidos };

  if (resume) {
    const st = loadState();
    if (st) {
      processed = Number(st.processed ?? 0);
      explicacoesReescritas = Number(st.explicacoesReescritas ?? 0);
      const savedFeed = st.feedReservoir as FraseEnriquecida[] | undefined;
      if (savedFeed?.length) feedReservoir.push(...savedFeed);
      console.log(`↩ Retomando (${processed} frases no checkpoint; autores já enriquecidos serão reindexados)`);
    }
  }

  console.log(`📦 Fase 2: ${maxFiles.length} arquivos de autor…`);

  for (let fi = 0; fi < maxFiles.length; fi++) {
    const file = maxFiles[fi];
    const arr = JSON.parse(fs.readFileSync(file, 'utf8')) as FraseCanonical[];
    const enrichedBatch: FraseEnriquecida[] = [];

    if (isAlreadyEnriched(arr)) {
      for (const e of arr as FraseEnriquecida[]) {
        ingestEnriched(e, shards, stats);
        processed++;
        if (feedReservoir.length < FEED_TARGET) feedReservoir.push(e);
        else if (Math.random() < FEED_TARGET / processed) {
          feedReservoir[Math.floor(Math.random() * FEED_TARGET)] = e;
        }
      }
      if ((fi + 1) % 500 === 0) {
        console.log(`   … ${fi + 1}/${maxFiles.length} (cache) | ${processed} frases`);
      }
      continue;
    }

    for (const raw of arr) {
      const e = enrichFraseRecord(raw);
      if (raw.explicacao !== e.explicacao) explicacoesReescritas++;
      ingestEnriched(e, shards, stats);
      enrichedBatch.push(e);
      processed++;
      if (feedReservoir.length < FEED_TARGET) {
        feedReservoir.push(e);
      } else if (Math.random() < FEED_TARGET / processed) {
        feedReservoir[Math.floor(Math.random() * FEED_TARGET)] = e;
      }
    }

    if (!args.includes('--dry-run')) {
      writeQueue.enqueue(() => atomicWriteFile(file, JSON.stringify(enrichedBatch, null, 2) + '\n'));
    }

    if ((fi + 1) % 500 === 0) {
      console.log(`   … ${fi + 1}/${maxFiles.length} autores | ${processed} frases`);
    }

    if ((fi + 1) % FLUSH_EVERY === 0) {
      flushShardsToDisk(shards);
      saveState({
        lastFileIndex: fi + 1,
        processed,
        explicacoesReescritas,
        feedReservoir: feedReservoir.slice(0, FEED_TARGET),
        updatedAt: new Date().toISOString(),
      });
      console.log(`   💾 Shards gravados (${fi + 1} autores)`);
    }
  }

  fs.mkdirSync(path.join(OUT_DIR, 'index'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'detail'), { recursive: true });

  await writeQueue.drain();
  flushShardsToDisk(shards);
  const shardKeys = fs
    .readdirSync(path.join(OUT_DIR, 'detail'))
    .filter((n) => n.startsWith('shard-') && n.endsWith('.json'))
    .map((n) => n.replace('shard-', '').replace('.json', ''));

  atomicWrite(
    path.join(OUT_DIR, 'feed-sample.json'),
    feedReservoir.map((f) => ({
      id: f!.id,
      tipo: 'frase',
      texto: f!.texto,
      autor: f!.autor,
      tags: f!.palavras_chave,
      slug: f!.slug,
    }))
  );

  const indicesDir = path.join(ROOT, 'public', 'indices');
  fs.mkdirSync(indicesDir, { recursive: true });

  const toSortedIndex = (m: Map<string, number>, label: string) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([slug, count]) => ({
        slug,
        nome: slug.replace(/-/g, ' '),
        count,
        path: `/${label}/${slug}`,
      }));

  atomicWrite(path.join(indicesDir, 'autores-index.json'), [...autoresMap.values()].sort((a, b) => b.count - a.count));
  atomicWrite(path.join(indicesDir, 'categorias-index.json'), toSortedIndex(catMap, 'categoria'));
  atomicWrite(path.join(indicesDir, 'contextos-index.json'), toSortedIndex(ctxMap, 'contexto'));
  atomicWrite(path.join(indicesDir, 'emocoes-index.json'), toSortedIndex(emoMap, 'emocao'));
  atomicWrite(path.join(indicesDir, 'temas-index.json'), toSortedIndex(temaMap, 'tema'));
  atomicWrite(path.join(indicesDir, 'keywords-index.json'), toSortedIndex(kwMap, 'palavra-chave'));
  atomicWrite(path.join(indicesDir, 'seo-index.json'), seoEntries);

  atomicWrite(path.join(OUT_DIR, 'manifest.json'), {
    version: 2,
    totalFrases: processed,
    shards: shardKeys.map((k) => `index/shard-${k}.json`),
    detailShards: shardKeys.map((k) => `detail/shard-${k}.json`),
    feedSample: 'feed-sample.json',
    updatedAt: new Date().toISOString(),
  });

  const report = {
    concluidoEm: new Date().toISOString(),
    frasesProcessadas: processed,
    explicacoesReescritas,
    autoresEnriquecidos: autoresEnriquecidos.size,
    shards: shardKeys.length,
    feedSample: feedReservoir.length,
    indices: {
      autores: autoresMap.size,
      categorias: catMap.size,
      contextos: ctxMap.size,
      emocoes: emoMap.size,
      temas: temaMap.size,
      keywords: kwMap.size,
      seo: seoEntries.length,
    },
    impactoSeo: {
      resumo:
        'Metadados title/description/keywords por frase; índices de agrupamento para rotas dinâmicas; shards para performance.',
      paginasAgrupamento: [
        '/autor/[slug]',
        '/categoria/[slug]',
        '/contexto/[slug]',
        '/emocao/[slug]',
        '/tema/[slug]',
        '/palavra-chave/[slug]',
      ],
    },
    custo: 'zero (heurísticas locais, sem API de IA)',
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  atomicWrite(REPORT_PATH, report, true);
  if (fs.existsSync(STATE_PATH)) fs.unlinkSync(STATE_PATH);

  console.log('\n✅ Fase 2 concluída');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
