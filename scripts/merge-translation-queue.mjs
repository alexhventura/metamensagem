/**
 * Mescla fila exportada (JSON) em shards public/frases-v2/translations/.
 * Uso: node scripts/merge-translation-queue.mjs data/translation-queue-export.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function shardForSlug(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return (h % 256).toString(16).padStart(2, '0');
}

const input = process.argv[2] || 'data/translation-queue-export.json';
if (!existsSync(input)) {
  console.error('Arquivo não encontrado:', input);
  console.error('Exporte a fila do navegador (mm-translation-queue-v1) para este JSON.');
  process.exit(1);
}

const entries = JSON.parse(readFileSync(input, 'utf8'));
const dir = join(process.cwd(), 'public', 'frases-v2', 'translations');
mkdirSync(dir, { recursive: true });

const byShard = new Map();

for (const e of entries) {
  if (!e?.slug || !e?.locale || !e?.text) continue;
  const shard = shardForSlug(e.slug);
  if (!byShard.has(shard)) byShard.set(shard, {});
  const shardObj = byShard.get(shard);
  const slug = e.slug.toLowerCase();
  if (!shardObj[slug]) shardObj[slug] = {};
  shardObj[slug][e.locale] = {
    text: e.text,
    from: e.from || 'pt',
    at: e.at || Date.now(),
  };
}

for (const [shard, partial] of byShard) {
  const path = join(dir, `shard-${shard}.json`);
  let existing = {};
  if (existsSync(path)) {
    existing = JSON.parse(readFileSync(path, 'utf8'));
  }
  for (const [slug, locales] of Object.entries(partial)) {
    existing[slug] = { ...(existing[slug] || {}), ...locales };
  }
  writeFileSync(path, JSON.stringify(existing));
}

const manifest = {
  version: 1,
  shards: [...byShard.keys()].map((s) => `shard-${s}.json`),
  mergedAt: new Date().toISOString(),
  entryCount: entries.length,
};
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Shards atualizados:', byShard.size, '| entradas:', entries.length);
