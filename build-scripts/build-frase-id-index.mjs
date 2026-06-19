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
  console.error('[build-frase-id-index] Pasta index ausente:', INDEX_DIR);
  console.error('[build-frase-id-index] Verifique se public/frases-v2/index foi clonado do Git.');
  process.exit(1);
}

const files = fs.readdirSync(INDEX_DIR).filter((f) => f.startsWith('shard-') && f.endsWith('.json'));
if (!files.length) {
  console.error('[build-frase-id-index] Nenhum shard-* encontrado em', INDEX_DIR);
  process.exit(1);
}
console.log('[build-frase-id-index] shards:', files.length);

const map = {};
for (const file of files) {
  const rows = JSON.parse(fs.readFileSync(path.join(INDEX_DIR, file), 'utf8'));
  for (const row of rows) {
    if (row?.id && row?.slug) map[row.id] = row.slug.toLowerCase();
  }
}

fs.writeFileSync(OUT, JSON.stringify(map));
console.log('✅ id-index.json —', Object.keys(map).length, 'frases');
