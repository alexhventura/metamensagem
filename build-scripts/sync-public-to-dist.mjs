/**
 * Copia public/ → dist/ de forma seletiva (pós vite build com publicDir desligado).
 * MM_EXCLUDE_DETAIL_FROM_DIST=1 + FRASES_STATIC_ORIGIN → omite detail (~1.2GB).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

const wantsExclude =
  process.env.MM_EXCLUDE_DETAIL_FROM_DIST === '1' ||
  process.env.MM_EXCLUDE_DETAIL_FROM_DIST === 'true';

const staticOrigin = (
  process.env.FRASES_STATIC_ORIGIN ||
  process.env.VITE_FRASES_STATIC_ORIGIN ||
  ''
).trim();

const excludeDetail = wantsExclude && staticOrigin.length > 0;

const DETAIL_PREFIX = 'frases-v2/detail';

function shouldSkip(relativePath) {
  if (!excludeDetail) return false;
  return relativePath === DETAIL_PREFIX || relativePath.startsWith(`${DETAIL_PREFIX}/`);
}

function copyRecursive(srcDir, destDir, relative = '') {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    const rel = relative ? `${relative}/${name}` : name;
    if (shouldSkip(rel)) continue;
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      copyRecursive(src, dest, rel);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

if (!fs.existsSync(DIST)) {
  console.error('[sync-public] dist/ ausente — rode vite build antes');
  process.exit(1);
}

if (wantsExclude && !staticOrigin) {
  console.warn(
    '[sync-public] MM_EXCLUDE_DETAIL_FROM_DIST=1 sem FRASES_STATIC_ORIGIN — copiando detail (deploy lento). Defina FRASES_STATIC_ORIGIN na Vercel.'
  );
} else if (excludeDetail) {
  console.log('[sync-public] detail omitido (~1.2GB); origem:', staticOrigin.replace(/\/$/, ''));
}

copyRecursive(PUBLIC, DIST);
console.log('[sync-public] ✓ assets estáticos sincronizados');
