/**
 * Índice id → slug para OG /imagem/:id (só shards index, leve).
 * Uso: npm run frases:id-index
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_DIR = path.join(ROOT, 'public', 'frases-v2', 'index');
const OUT = path.join(ROOT, 'public', 'frases-v2', 'id-index.json');

if (!fs.existsSync(INDEX_DIR)) {
  console.error('Pasta index ausente:', INDEX_DIR);
  process.exit(1);
}

const map = {};
for (const file of fs.readdirSync(INDEX_DIR)) {
  if (!file.startsWith('shard-') || !file.endsWith('.json')) continue;
  const rows = JSON.parse(fs.readFileSync(path.join(INDEX_DIR, file), 'utf8'));
  for (const row of rows) {
    if (row?.id && row?.slug) map[row.id] = row.slug.toLowerCase();
  }
}

fs.writeFileSync(OUT, JSON.stringify(map));
console.log('✅ id-index.json —', Object.keys(map).length, 'frases');
