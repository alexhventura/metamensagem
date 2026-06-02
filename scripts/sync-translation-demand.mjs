/**
 * Mescla export de demanda (navegador) em data/translation-queue.json
 * Uso: node scripts/sync-translation-demand.mjs [data/translation-demand-export.json]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const input = process.argv[2] || 'data/translation-demand-export.json';
const queuePath = join(process.cwd(), 'data', 'translation-queue.json');

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

const existing = loadJson(queuePath, {});
const payload = loadJson(input, null);

if (!payload) {
  console.error('Export não encontrado:', input);
  console.error('No navegador: copy(JSON.stringify(exportTranslationDemandForCi()))');
  process.exit(1);
}

const incoming = payload.queue || payload;
if (!incoming || typeof incoming !== 'object') {
  console.error('Formato inválido — esperado { queue: { phraseId: { en: N } } }');
  process.exit(1);
}

const merged = { ...existing };
for (const [phraseId, locales] of Object.entries(incoming)) {
  if (!merged[phraseId]) merged[phraseId] = {};
  for (const [locale, count] of Object.entries(locales)) {
    const n = Number(count) || 0;
    if (!n) continue;
    merged[phraseId][locale] = (merged[phraseId][locale] || 0) + n;
  }
}

writeFileSync(queuePath, JSON.stringify(merged, null, 2));
console.log('Atualizado', queuePath, '| frases:', Object.keys(merged).length);
