/**
 * Prioriza fila e gera traduções oficiais (MyMemory) para o acervo.
 * Uso: npm run build-translations [--limit=30]
 * Requer: relatório (translation-report) e texto das frases nos shards detail.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const reportPath = join(ROOT, 'data', 'translation-report.json');
const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1]) || 30;

const MYMEMORY = 'https://api.mymemory.translated.net/get';
const LANG_MAP = { pt: 'pt-BR', en: 'en', es: 'es', fr: 'fr', de: 'de', it: 'it', ja: 'ja', hi: 'hi' };

function shardForSlug(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return (h % 256).toString(16).padStart(2, '0');
}

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

const report = loadJson(reportPath);
if (!report?.pendingTop?.length) {
  console.error('Execute npm run translation-report antes (ou fila vazia).');
  process.exit(1);
}

const detailDir = join(ROOT, 'public', 'frases-v2', 'detail');
const slugIndex = new Map();

if (existsSync(detailDir)) {
  for (const file of readdirSync(detailDir)) {
    if (!file.startsWith('shard-') || !file.endsWith('.json')) continue;
    const list = JSON.parse(readFileSync(join(detailDir, file), 'utf8'));
    for (const row of list) {
      const slug = (row.slug || '').toLowerCase();
      const text = row.frase_original || row.texto || '';
      if (slug && text) slugIndex.set(slug, { text, id: row.id });
    }
  }
}

async function translateText(text, from, to) {
  const pair = `${LANG_MAP[from] || from}|${LANG_MAP[to] || to}`;
  const url = `${MYMEMORY}?q=${encodeURIComponent(text.slice(0, 480))}&langpair=${pair}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data?.quotaFinished) throw new Error('quotaFinished');
  const out = data?.responseData?.translatedText?.trim();
  if (!out) throw new Error('empty');
  return out;
}

function detectFrom(text) {
  if (/[áàâãéêíóôõúç]/i.test(text)) return 'pt';
  if (/[ñ¿¡]/i.test(text) || /\b(el|la|los|que|por|para)\b/i.test(text)) return 'es';
  return 'en';
}

const batch = [];
const targets = report.pendingTop.slice(0, limit);

for (const item of targets) {
  const slug = (item.slug || '').toLowerCase();
  const frase = slugIndex.get(slug);
  if (!frase?.text) {
    console.warn('Sem texto:', slug);
    continue;
  }
  const from = detectFrom(frase.text);
  const to = item.locale;
  if (from === to) continue;
  try {
    await new Promise((r) => setTimeout(r, 400));
    const translated = await translateText(frase.text, from, to);
    batch.push({
      slug,
      locale: to,
      text: translated,
      from,
      at: Date.now(),
    });
    console.log('OK', slug.slice(0, 40), to);
  } catch (e) {
    console.warn('Falha', slug, to, e.message);
    if (String(e.message).includes('quota') || String(e.message).includes('429')) {
      console.error('Cota esgotada — interrompendo batch.');
      break;
    }
  }
}

if (!batch.length) {
  console.log('Nenhuma tradução gerada.');
  process.exit(0);
}

const outPath = join(ROOT, 'data', 'translation-batch-built.json');
writeFileSync(outPath, JSON.stringify(batch, null, 2));
console.log('Salvo', outPath, '| entradas:', batch.length);

if (batch.length > 0) {
  const { spawnSync } = await import('node:child_process');
  const merge = spawnSync('node', ['scripts/merge-translation-queue.mjs', outPath], {
    stdio: 'inherit',
    cwd: ROOT,
  });
  if (merge.status !== 0) {
    console.warn('Merge falhou — rode: npm run translations:merge --', outPath);
    process.exit(merge.status ?? 1);
  }
  console.log('Shards de tradução atualizados.');
}
