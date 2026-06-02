/**
 * Gera data/translation-report.json — disponíveis, pendentes e rankings.
 * Uso: npm run translation-report
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const queuePath = join(ROOT, 'data', 'translation-queue.json');
const translationsDir = join(ROOT, 'public', 'frases-v2', 'translations');
const reportPath = join(ROOT, 'data', 'translation-report.json');
const SEO_LOCALES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'];

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function shardForSlug(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return (h % 256).toString(16).padStart(2, '0');
}

/** slug por phraseId a partir de meta exportada ou fila legada */
const slugById = new Map();
const metaExport = loadJson(join(ROOT, 'data', 'translation-demand-export.json'), null);
if (metaExport?.meta) {
  for (const [id, m] of Object.entries(metaExport.meta)) {
    if (m?.slug) slugById.set(id, m.slug);
  }
}

const demand = loadJson(queuePath, {});
const availableByLocale = Object.fromEntries(SEO_LOCALES.map((l) => [l, 0]));
const availablePairs = [];
let shardFiles = [];
if (existsSync(translationsDir)) {
  shardFiles = readdirSync(translationsDir).filter((f) => f.startsWith('shard-') && f.endsWith('.json'));
}

const availableSet = new Set();
for (const file of shardFiles) {
  const shard = JSON.parse(readFileSync(join(translationsDir, file), 'utf8'));
  for (const [slug, locales] of Object.entries(shard)) {
    for (const loc of SEO_LOCALES) {
      if (locales?.[loc]?.text?.trim()) {
        availableByLocale[loc]++;
        availableSet.add(`${slug}::${loc}`);
        availablePairs.push({ slug, locale: loc });
      }
    }
  }
}

const languageTotals = Object.fromEntries(SEO_LOCALES.map((l) => [l, 0]));
const phraseRanking = [];
const categoryTotals = Object.fromEntries(
  [...new Set(Object.values(metaExport?.meta || {}).map((m) => m?.category).filter(Boolean))].map(
    (c) => [c, 0]
  )
);
const countryTotals = {};

for (const [phraseId, locales] of Object.entries(demand)) {
  const slug = slugById.get(phraseId) || phraseId;
  for (const [locale, count] of Object.entries(locales)) {
    const n = Number(count) || 0;
    if (!n) continue;
    languageTotals[locale] = (languageTotals[locale] || 0) + n;
    phraseRanking.push({
      phraseId,
      slug,
      locale,
      requests: n,
      hasOfficial: availableSet.has(`${slug}::${locale}`),
    });
    const meta = metaExport?.meta?.[phraseId];
    if (meta?.category) categoryTotals[meta.category] = (categoryTotals[meta.category] || 0) + n;
    if (meta?.countries) {
      for (const [cc, c] of Object.entries(meta.countries)) {
        countryTotals[cc] = (countryTotals[cc] || 0) + Number(c) || 0;
      }
    }
  }
}

phraseRanking.sort((a, b) => b.requests - a.requests);
const pending = phraseRanking.filter((p) => !p.hasOfficial);

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    officialTranslations: availablePairs.length,
    pendingRequests: pending.reduce((s, p) => s + p.requests, 0),
    uniquePhrasesInQueue: Object.keys(demand).length,
  },
  availableByLocale,
  rankings: {
    languages: Object.entries(languageTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([locale, requests]) => ({ locale, requests })),
    phrases: phraseRanking.slice(0, 200),
    categories: Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, requests]) => ({ category, requests })),
    countries: Object.entries(countryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([country, requests]) => ({ country, requests })),
  },
  pendingTop: pending.slice(0, 100),
};

writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log('Relatório:', reportPath);
console.log('Oficiais:', report.summary.officialTranslations, '| Pendentes (req):', report.summary.pendingRequests);
