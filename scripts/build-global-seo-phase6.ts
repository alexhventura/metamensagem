/**
 * Fase 6 — SEO global: languageOriginal, i18n-meta (top 20k), countries, relatório.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectLanguageOriginal } from '../lib/i18n/detectLanguage';
import { COUNTRY_PRIORITY, type SeoLocale } from '../lib/i18n/locales';
import { buildFraseI18nSeo } from '../lib/seo/i18nTemplates';
import { assignClusterSlug, SEO_CLUSTERS } from '../lib/seo/clusters';
import { shardForSlug } from '../lib/enrichment/enrichFrase';
import type { FraseEnriquecida } from '../lib/enrichment/types';
import { atomicWriteFile, WriteQueue } from '../lib/importers/shared/writeQueue';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DETAIL_DIR = path.join(ROOT, 'public', 'frases-v2', 'detail');
const I18N_META_DIR = path.join(ROOT, 'public', 'frases-v2', 'i18n-meta');
const COUNTRIES_DIR = path.join(ROOT, 'public', 'seo-graph', 'countries');
const REPORT = path.join(ROOT, 'data', 'import', 'reports', 'global-seo-phase6.json');
const TOP_SLUGS_FILE = path.join(ROOT, 'data', 'import', 'global-top-20k-slugs.json');

const TOP_N = 20_000;
const writeQueue = new WriteQueue(2);

const FAMOUS_AUTHORS = new Set(
  [
    'albert-einstein', 'william-shakespeare', 'mark-twain', 'oscar-wilde', 'winston-churchill',
    'mahatma-gandhi', 'nelson-mandela', 'martin-luther-king', 'steve-jobs', 'paulo-coelho',
    'fernando-pessoa', 'machado-de-assis', 'clarice-lispector', 'carlos-drummond-de-andrade',
  ].map((s) => s.toLowerCase())
);

function scoreFrase(f: FraseEnriquecida): number {
  let s = f.semantica?.popularidade ?? 20;
  if (FAMOUS_AUTHORS.has((f.autorSlug || '').toLowerCase())) s += 40;
  const terms = [
    f.semantica?.categoriaPrincipal,
    ...(f.semantica?.categorias || []),
    ...(f.semantica?.temas || []),
  ];
  if (assignClusterSlug(terms.filter(Boolean) as string[]) !== 'frases-sobre-vida') s += 10;
  s += Math.min(15, (f.frase_original?.length || 0) / 30);
  return s;
}

async function main() {
  const files = fs.readdirSync(DETAIL_DIR).filter((f) => f.startsWith('shard-') && f.endsWith('.json'));
  const scored: { slug: string; score: number; frase: FraseEnriquecida }[] = [];
  const langCounts: Record<string, number> = {};

  console.log(`📖 Lendo ${files.length} shards…`);

  for (const file of files) {
    const arr = JSON.parse(fs.readFileSync(path.join(DETAIL_DIR, file), 'utf8')) as FraseEnriquecida[];
    for (const f of arr) {
      const lang = detectLanguageOriginal(f.frase_original || f.texto);
      langCounts[lang] = (langCounts[lang] || 0) + 1;
      if (f.semantica) {
        f.semantica.idiomaOriginal = lang;
        f.semantica.languageOriginal = lang;
      }
      scored.push({ slug: f.slug, score: scoreFrase(f), frase: f });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, TOP_N);
  const topSet = new Set(top.map((t) => t.slug.toLowerCase()));

  fs.mkdirSync(path.dirname(TOP_SLUGS_FILE), { recursive: true });
  fs.writeFileSync(TOP_SLUGS_FILE, JSON.stringify(top.map((t) => t.slug)) + '\n');

  fs.mkdirSync(I18N_META_DIR, { recursive: true });
  const metaByShard = new Map<string, Record<string, ReturnType<typeof buildFraseI18nSeo>>>();

  for (const { frase } of top) {
    const lang = detectLanguageOriginal(frase.frase_original) as SeoLocale;
    const meta = buildFraseI18nSeo({
      frase: frase.frase_original,
      autor: frase.autor_original,
      tema: frase.semantica?.categoriaPrincipal,
      languageOriginal: lang,
      includeExtra: true,
    });
    const sk = shardForSlug(frase.slug);
    if (!metaByShard.has(sk)) metaByShard.set(sk, {});
    metaByShard.get(sk)![frase.slug.toLowerCase()] = meta;
  }

  for (const [sk, data] of metaByShard) {
    writeQueue.enqueueJson(path.join(I18N_META_DIR, `shard-${sk}.json`), data);
  }
  await writeQueue.drain();

  // Países / clusters (templates)
  const countryClusterTitles: Record<string, Record<string, { slug: string; title: string; description: string }>> = {
    US: { 'frases-sobre-amor': { slug: 'quotes-about-love', title: 'Quotes about Love', description: 'Curated love quotes for sharing and inspiration.' } },
    BR: { 'frases-sobre-amor': { slug: 'frases-de-amor', title: 'Frases de Amor', description: 'Frases de amor selecionadas para inspirar e compartilhar.' } },
    ES: { 'frases-sobre-amor': { slug: 'frases-de-amor', title: 'Frases de Amor', description: 'Frases de amor para reflexión y compartir.' } },
    FR: { 'frases-sobre-amor': { slug: 'frases-d-amour', title: "Frases d'amour", description: 'Citations sur l\'amour sélectionnées pour vous.' } },
    DE: { 'frases-sobre-amor': { slug: 'liebeszitate', title: 'Liebeszitate', description: 'Ausgewählte Liebeszitate zum Teilen.' } },
    IT: { 'frases-sobre-amor': { slug: 'citazioni-amore', title: 'Citazioni d\'amore', description: 'Citazioni sull\'amore curate.' } },
    JP: { 'frases-sobre-amor': { slug: 'ai-no-meigen', title: '愛の名言', description: '厳選された愛の名言集。' } },
    IN: { 'frases-sobre-amor': { slug: 'prem-udharan', title: 'प्रेम उद्धरण', description: 'चुने हुए प्रेम उद्धरण।' } },
  };

  fs.mkdirSync(COUNTRIES_DIR, { recursive: true });
  for (const cc of COUNTRY_PRIORITY) {
    const dir = path.join(COUNTRIES_DIR, cc);
    fs.mkdirSync(dir, { recursive: true });
    for (const cluster of SEO_CLUSTERS) {
      const localized = countryClusterTitles[cc]?.[cluster.clusterSlug];
      const page = {
        country: cc,
        clusterSlug: cluster.clusterSlug,
        localSlug: localized?.slug || cluster.clusterSlug,
        titleSeo: localized?.title || cluster.clusterTitle,
        descriptionSeo: localized?.description || cluster.clusterDescription,
        featuredText: localized?.description || cluster.clusterDescription,
        summary: cluster.clusterDescription,
        excerpt: (localized?.description || cluster.clusterDescription).slice(0, 160),
        introText: localized?.description || cluster.clusterDescription,
        canonicalPath: `/frases-sobre/${cluster.clusterSlug}`,
        quoteSlugsSample: top.slice(0, 12).map((t) => t.slug),
      };
      atomicWriteFile(path.join(dir, `${cluster.clusterSlug}.json`), JSON.stringify(page, null, 2) + '\n');
    }
  }

  const manifestPath = path.join(ROOT, 'public', 'seo-graph', 'manifest.json');
  let manifest: Record<string, unknown> = {};
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  manifest.countryPriority = [...COUNTRY_PRIORITY];
  manifest.i18nMetaShards = fs.readdirSync(I18N_META_DIR).filter((f) => f.endsWith('.json'));
  manifest.localePrefixes = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'];
  atomicWriteFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const report = {
    concluidoEm: new Date().toISOString(),
    frasesAnalisadas: scored.length,
    idiomasDetectados: langCounts,
    top20k: top.length,
    i18nMetaShards: metaByShard.size,
    clustersPorPais: COUNTRY_PRIORITY.length * SEO_CLUSTERS.length,
    localeUrlPattern: {
      pt: '/frases/{slug}',
      outros: '/{lang}/frases/{slug}',
    },
    impactoSeo: 'URLs alternativas por idioma (opção B) + meta templates top 20k',
    custo: 'zero',
  };

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log('\n✅ Fase 6 build concluída\n', JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
