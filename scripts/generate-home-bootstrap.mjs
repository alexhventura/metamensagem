/**
 * Gera public/home-bootstrap.json — payload leve só para a Home (<20 KB alvo).
 * Rode via prepare-data.cjs ou: node scripts/generate-home-bootstrap.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'home-bootstrap.json');
const INDEX_METAFORAS = path.join(ROOT, 'public', 'metaforas-index.json');
const FEED_SAMPLE = path.join(ROOT, 'public', 'frases-v2', 'feed-sample.json');
const INDEX_FRASES = path.join(ROOT, 'public', 'frases-index.json');

const META_N = 16;
const FRASE_N = 16;
const TAG_CAP = 24;

function atomicWrite(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const body = JSON.stringify(data);
  const tmp = path.join(dir, `._tmp_bootstrap_${process.pid}.json`);
  fs.writeFileSync(tmp, body, 'utf8');
  fs.renameSync(tmp, filePath);
}

function pickTags(...lists) {
  const set = new Set();
  for (const list of lists) {
    for (const t of list) {
      const s = String(t || '').trim();
      if (s) set.add(s);
    }
  }
  return [...set].slice(0, TAG_CAP);
}

export function generateHomeBootstrap() {
  let metaforas = [];
  let frases = [];

  if (fs.existsSync(INDEX_METAFORAS)) {
    const idx = JSON.parse(fs.readFileSync(INDEX_METAFORAS, 'utf8'));
    metaforas = Array.isArray(idx) ? idx.slice(0, META_N) : [];
  }

  if (fs.existsSync(FEED_SAMPLE)) {
    const feed = JSON.parse(fs.readFileSync(FEED_SAMPLE, 'utf8'));
    frases = Array.isArray(feed) ? feed.slice(0, FRASE_N) : [];
  } else if (fs.existsSync(INDEX_FRASES)) {
    const idx = JSON.parse(fs.readFileSync(INDEX_FRASES, 'utf8'));
    frases = Array.isArray(idx) ? idx.slice(0, FRASE_N) : [];
  }

  const tags = pickTags(
    metaforas.flatMap((m) => m.tags || []),
    frases.flatMap((f) => f.tags || [])
  );

  const payload = { v: 1, metaforas, frases, tags };
  atomicWrite(OUT, payload);
  const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`✅ home-bootstrap.json — ${metaforas.length} metáforas, ${frases.length} frases, ${tags.length} tags (~${kb} KB)`);
  return payload;
}

if (process.argv[1]?.includes('generate-home-bootstrap')) {
  generateHomeBootstrap();
}
