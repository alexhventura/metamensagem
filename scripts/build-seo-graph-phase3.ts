/**
 * Fase 3 — grafo semântico + SEO + busca fragmentada (custo zero).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEO_CLUSTERS, assignClusterSlug } from '../lib/seo/clusters';
import { buildClusterPage, buildEntityPage } from '../lib/seo/phase3/pageMeta';
import { buildRelationsForSlug } from '../lib/seo/phase3/relations';
import type { FraseEnriquecida } from '../lib/enrichment/types';
import type { QuoteRelations, SearchIndexPart } from '../lib/seo/phase3/types';
import { atomicWriteFile, WriteQueue } from '../lib/importers/shared/writeQueue';
import { shardForSlug } from '../lib/enrichment/enrichFrase';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DETAIL_DIR = path.join(ROOT, 'public', 'frases-v2', 'detail');
const OUT = path.join(ROOT, 'public', 'seo-graph');
const REPORT = path.join(ROOT, 'data', 'import', 'reports', 'phase3-seo-graph.json');
const STATE = path.join(ROOT, 'data', 'import', 'phase3-state.json');

const args = process.argv.slice(2);
const resume = args.includes('--resume');
const writeQueue = new WriteQueue(2);

const STOP = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'your', 'have', 'uma', 'para', 'como', 'que']);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function pushMap(m: Map<string, string[]>, key: string, slug: string, cap = 500) {
  if (!key) return;
  const list = m.get(key) || [];
  if (list.length < cap && !list.includes(slug)) list.push(slug);
  m.set(key, list);
}

function shardKey(slug: string): string {
  return shardForSlug(slug);
}

async function main() {
  const detailFiles = fs.existsSync(DETAIL_DIR)
    ? fs.readdirSync(DETAIL_DIR).filter((f) => f.startsWith('shard-') && f.endsWith('.json'))
    : [];

  if (!detailFiles.length) {
    console.error('❌ Nenhum shard em public/frases-v2/detail — rode frases:enrich:phase2 antes.');
    process.exit(1);
  }

  type Phase3State = { phase: 'index' | 'relations'; detailFileIndex: number; totalFrases?: number };
  let phase: Phase3State['phase'] = 'index';
  let startFile = 0;
  let totalFrases = 0;
  let relationsCount = 0;
  if (resume && fs.existsSync(STATE)) {
    const st = JSON.parse(fs.readFileSync(STATE, 'utf8')) as Phase3State;
    phase = st.phase === 'relations' ? 'relations' : 'index';
    startFile = Number(st.detailFileIndex ?? 0);
    totalFrases = Number(st.totalFrases ?? 0);
    console.log(`↩ Retomando fase 3 (${phase}) shard ${startFile + 1}/${detailFiles.length}`);
  }

  const byCluster = new Map<string, string[]>();
  const byAutor = new Map<string, string[]>();
  const byCategoria = new Map<string, string[]>();
  const byContexto = new Map<string, string[]>();
  const byEmocao = new Map<string, string[]>();
  const byTema = new Map<string, string[]>();
  const byKeyword = new Map<string, string[]>();
  const autorNames = new Map<string, string>();
  const slugToAutor = new Map<string, string>();

  const searchParts = new Map<string, SearchIndexPart>();

  console.log(`📇 Indexando ${detailFiles.length} shards…`);

  if (phase === 'index') {
  for (let fi = startFile; fi < detailFiles.length; fi++) {
    const file = detailFiles[fi];
    const arr = JSON.parse(fs.readFileSync(path.join(DETAIL_DIR, file), 'utf8')) as FraseEnriquecida[];

    for (const f of arr) {
      totalFrases++;
      const sem = f.semantica;
      if (!sem) continue;
      const categorias = Array.isArray(sem.categorias) ? sem.categorias : [];
      const contextos = Array.isArray(sem.contextos) ? sem.contextos : [];
      const emocoes = Array.isArray(sem.emocoes) ? sem.emocoes : [];
      const temas = Array.isArray(sem.temas) ? sem.temas : [];
      const palavrasChave = Array.isArray(sem.palavrasChave) ? sem.palavrasChave : f.palavras_chave || [];
      const terms = [sem.categoriaPrincipal, ...categorias, ...contextos, ...emocoes, ...temas, ...palavrasChave];
      const clusterSlug = assignClusterSlug(terms);
      const autorSlug = f.autorSlug || 'anonimo';

      if (f.autor) autorNames.set(autorSlug, f.autor);
      slugToAutor.set(f.slug, autorSlug);
      pushMap(byCluster, clusterSlug, f.slug);
      pushMap(byAutor, autorSlug, f.slug);
      pushMap(byCategoria, sem.categoriaPrincipal || f.categoria, f.slug);
      for (const c of contextos) pushMap(byContexto, c, f.slug);
      for (const e of emocoes) pushMap(byEmocao, e, f.slug);
      for (const t of temas) pushMap(byTema, t, f.slug);
      for (const k of palavrasChave) pushMap(byKeyword, String(k), f.slug);

      for (const tok of tokenize(f.texto || f.frase_original)) {
        const bucket = tok[0];
        if (!/^[a-z0-9]$/.test(bucket)) continue;
        const part = searchParts.get(bucket) || {};
        const list = Array.isArray(part[tok]) ? [...part[tok]] : [];
        if (list.length < 80 && !list.includes(f.slug)) list.push(f.slug);
        part[tok] = list;
        searchParts.set(bucket, part);
      }
      for (const tok of tokenize(f.autor)) {
        const bucket = tok[0];
        if (!/^[a-z0-9]$/.test(bucket)) continue;
        const part = searchParts.get(bucket) || {};
        const key = `autor:${tok}`;
        const list = Array.isArray(part[key]) ? [...part[key]] : [];
        if (list.length < 40 && !list.includes(f.slug)) list.push(f.slug);
        part[key] = list;
        searchParts.set(bucket, part);
      }
    }

    if ((fi + 1) % 20 === 0 || fi === detailFiles.length - 1) {
      atomicWriteFile(
        STATE,
        JSON.stringify({ phase: 'index', detailFileIndex: fi + 1, totalFrases, updatedAt: new Date().toISOString() })
      );
      console.log(`   … ${fi + 1}/${detailFiles.length} indexados | ${totalFrases} frases`);
    }
  }
  }

  console.log('🔗 Relacionamentos (índices completos)…');
  fs.mkdirSync(path.join(OUT, 'relations'), { recursive: true });
  const relStart = phase === 'relations' ? startFile : 0;
  for (let fi = relStart; fi < detailFiles.length; fi++) {
    const file = detailFiles[fi];
    const arr = JSON.parse(fs.readFileSync(path.join(DETAIL_DIR, file), 'utf8')) as FraseEnriquecida[];
    const relationsBatch = new Map<string, Record<string, QuoteRelations>>();

    for (const f of arr) {
      const sem = f.semantica;
      if (!sem) continue;
      const categorias = Array.isArray(sem.categorias) ? sem.categorias : [];
      const contextos = Array.isArray(sem.contextos) ? sem.contextos : [];
      const emocoes = Array.isArray(sem.emocoes) ? sem.emocoes : [];
      const temas = Array.isArray(sem.temas) ? sem.temas : [];
      const palavrasChave = Array.isArray(sem.palavrasChave) ? sem.palavrasChave : f.palavras_chave || [];
      const terms = [sem.categoriaPrincipal, ...categorias, ...contextos, ...emocoes, ...temas, ...palavrasChave];
      const clusterSlug = assignClusterSlug(terms);
      const autorSlug = f.autorSlug || 'anonimo';
      const rel = buildRelationsForSlug(f.slug, {
        clusterSlug,
        autorSlug,
        categoria: sem.categoriaPrincipal || f.categoria,
        contextos,
        temas,
        keywords: palavrasChave.map(String),
        byCluster,
        byAutor,
        byCategoria,
        byContexto,
        byTema,
        byKeyword,
        slugToAutor,
      });
      relationsCount += rel.relatedQuotes.length;
      const rsk = shardKey(f.slug);
      if (!relationsBatch.has(rsk)) relationsBatch.set(rsk, {});
      relationsBatch.get(rsk)![f.slug] = rel;
    }

    for (const [rsk, data] of relationsBatch) {
      const relPath = path.join(OUT, 'relations', `shard-${rsk}.json`);
      let existing: Record<string, QuoteRelations> = {};
      if (fs.existsSync(relPath)) {
        existing = JSON.parse(fs.readFileSync(relPath, 'utf8')) as Record<string, QuoteRelations>;
      }
      Object.assign(existing, data);
      writeQueue.enqueueJson(relPath, existing);
    }

    if ((fi + 1) % 20 === 0 || fi === detailFiles.length - 1) {
      atomicWriteFile(
        STATE,
        JSON.stringify({ phase: 'relations', detailFileIndex: fi + 1, totalFrases, updatedAt: new Date().toISOString() })
      );
      console.log(`   … rel ${fi + 1}/${detailFiles.length}`);
    }
  }

  await writeQueue.drain();
  const relationsShardFiles = fs.existsSync(path.join(OUT, 'relations'))
    ? fs.readdirSync(path.join(OUT, 'relations')).filter((f) => f.startsWith('shard-'))
    : [];

  console.log('📄 Páginas SEO (clusters + entidades)…');
  fs.mkdirSync(path.join(OUT, 'pages', 'clusters'), { recursive: true });
  const clusterPages: string[] = [];
  for (const cluster of SEO_CLUSTERS) {
    const count = (byCluster.get(cluster.clusterSlug) || []).length;
    const page = buildClusterPage(cluster, count);
    page.relatedClusters = SEO_CLUSTERS.filter((c) => c.clusterSlug !== cluster.clusterSlug)
      .slice(0, 5)
      .map((c) => c.clusterSlug);
    clusterPages.push(cluster.clusterSlug);
    writeQueue.enqueueJson(path.join(OUT, 'pages', 'clusters', `${cluster.clusterSlug}.json`), page, true);
  }

  const authorShards = new Map<string, Record<string, ReturnType<typeof buildEntityPage>>>();
  for (const [autorSlug, name] of autorNames) {
    const count = (byAutor.get(autorSlug) || []).length;
    const page = buildEntityPage('autor', autorSlug, name, count);
    const sk = shardKey(autorSlug);
    if (!authorShards.has(sk)) authorShards.set(sk, {});
    authorShards.get(sk)![autorSlug] = page;
  }
  fs.mkdirSync(path.join(OUT, 'pages', 'autores'), { recursive: true });
  for (const [sk, data] of authorShards) {
    writeQueue.enqueueJson(path.join(OUT, 'pages', 'autores', `shard-${sk}.json`), data);
  }

  const entityKinds = [
    { kind: 'categoria' as const, map: byCategoria, dir: 'categorias' },
    { kind: 'contexto' as const, map: byContexto, dir: 'contextos' },
    { kind: 'emocao' as const, map: byEmocao, dir: 'emocoes' },
    { kind: 'tema' as const, map: byTema, dir: 'temas' },
    { kind: 'keyword' as const, map: byKeyword, dir: 'keywords' },
  ];

  let entityPages = clusterPages.length;
  for (const { kind, map, dir } of entityKinds) {
    fs.mkdirSync(path.join(OUT, 'pages', dir), { recursive: true });
    const shardMap = new Map<string, Record<string, ReturnType<typeof buildEntityPage>>>();
    for (const [slug, slugs] of map) {
      if (!slug || slugs.length < 2) continue;
      const page = buildEntityPage(kind, slug, slug.replace(/-/g, ' '), slugs.length);
      const sk = shardKey(slug);
      if (!shardMap.has(sk)) shardMap.set(sk, {});
      shardMap.get(sk)![slug] = page;
      entityPages++;
    }
    for (const [sk, data] of shardMap) {
      writeQueue.enqueueJson(path.join(OUT, 'pages', dir, `shard-${sk}.json`), data);
    }
  }
  entityPages += authorShards.size;

  fs.mkdirSync(path.join(OUT, 'search'), { recursive: true });
  const searchManifest: string[] = [];
  for (const [bucket, part] of searchParts) {
    const name = `part-${bucket}.json`;
    searchManifest.push(name);
    writeQueue.enqueueJson(path.join(OUT, 'search', name), part);
  }

  const graphManifest = {
    version: 3,
    totalFrases,
    clusters: SEO_CLUSTERS.map((c) => c.clusterSlug),
    relationsShards: relationsShardFiles.map((f) => `relations/${f}`),
    searchParts: searchManifest,
    updatedAt: new Date().toISOString(),
  };

  writeQueue.enqueueJson(path.join(OUT, 'manifest.json'), graphManifest, true);
  await writeQueue.drain();

  const report = {
    concluidoEm: new Date().toISOString(),
    frasesNoGrafo: totalFrases,
    clustersCriados: SEO_CLUSTERS.length,
    paginasSeoGeradas: entityPages,
    relacionamentosCriados: relationsCount,
    autoresNoGrafo: autorNames.size,
    shardsRelacoes: relationsShardFiles.length,
    partesBusca: searchManifest.length,
    impactoSeo: {
      paginasIndexaveisEstimadas:
        SEO_CLUSTERS.length +
        autorNames.size +
        byCategoria.size +
        byContexto.size +
        byEmocao.size,
      focoAutores:
        '74k+ autores geram páginas /autor/[slug] com metadata Discover + JSON-LD — maior superfície orgânica.',
    },
    custo: 'zero',
  };

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  atomicWriteFile(REPORT, JSON.stringify(report, null, 2) + '\n');
  if (fs.existsSync(STATE)) fs.unlinkSync(STATE);

  console.log('\n✅ Fase 3 concluída\n', JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
