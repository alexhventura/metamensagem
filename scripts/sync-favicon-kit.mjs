/**
 * Copia o kit RealFaviconGenerator de Downloads/favicon para public/.
 * Uso: node scripts/sync-favicon-kit.mjs [pasta-origem]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const BRAND = path.join(PUBLIC, 'brand');

const DEFAULT_KIT = path.join(
  process.env.USERPROFILE || '',
  'Downloads',
  'favicon'
);

const kitDir = path.resolve(process.argv[2] || DEFAULT_KIT);

const required = [
  'favicon.ico',
  'favicon.svg',
  'favicon-96x96.png',
  'apple-touch-icon.png',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
];

function copyFile(name, destName = name) {
  const from = path.join(kitDir, name);
  const to = path.join(PUBLIC, destName);
  fs.copyFileSync(from, to);
  console.log(`  ✓ ${destName}`);
}

async function main() {
  if (!fs.existsSync(kitDir)) {
    console.error('❌ Pasta do kit não encontrada:', kitDir);
    process.exit(1);
  }

  console.log('📦 Sincronizando kit de favicon:', kitDir);
  for (const f of required) {
    if (!fs.existsSync(path.join(kitDir, f))) {
      console.error('❌ Arquivo ausente no kit:', f);
      process.exit(1);
    }
  }

  fs.mkdirSync(BRAND, { recursive: true });

  copyFile('favicon.ico');
  copyFile('favicon.svg');
  copyFile('favicon-96x96.png');
  copyFile('favicon-96x96.png', 'favicon.png');
  copyFile('apple-touch-icon.png');
  copyFile('web-app-manifest-192x192.png');
  copyFile('web-app-manifest-512x512.png');

  copyFile('favicon.svg', path.join('brand', 'logo.svg'));
  copyFile('favicon-96x96.png', path.join('brand', 'logo.png'));
  copyFile('web-app-manifest-192x192.png', path.join('brand', 'logo@2x.png'));

  const src96 = path.join(kitDir, 'favicon-96x96.png');
  for (const size of [32, 16]) {
    const out = path.join(PUBLIC, `favicon-${size}x${size}.png`);
    await sharp(src96)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    console.log(`  ✓ favicon-${size}x${size}.png`);
  }

  console.log('✅ Kit aplicado em public/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
