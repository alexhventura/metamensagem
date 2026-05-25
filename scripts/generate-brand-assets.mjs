/**
 * Gera favicons e logo do header a partir do PNG oficial.
 * Uso: node scripts/generate-brand-assets.mjs [caminho-origem.png]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BRAND = path.join(PUBLIC, 'brand');

const DEFAULT_SRC = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'c-Users-user-Desktop-metamensagem',
  'assets',
  'c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_favicon_metamensagem-0c963220-9c4e-432f-8f9b-3b9eefb1ee68.png'
);

const srcArg = process.argv[2];
const SRC = srcArg
  ? path.resolve(srcArg)
  : fs.existsSync(DEFAULT_SRC)
    ? DEFAULT_SRC
    : path.join(BRAND, 'source.png');

if (!fs.existsSync(SRC)) {
  console.error('❌ Imagem de origem não encontrada:', SRC);
  process.exit(1);
}

fs.mkdirSync(BRAND, { recursive: true });

/** Recorte de margem branca e centralização em quadrado. */
async function prepareMaster() {
  const meta = await sharp(SRC).metadata();
  const trimThreshold = 240;
  let pipeline = sharp(SRC).trim({
    threshold: trimThreshold,
    background: '#ffffff',
  });

  try {
    return await pipeline.png().toBuffer();
  } catch {
    return sharp(SRC).png().toBuffer();
  }
}

async function resizePng(buffer, size) {
  return sharp(buffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function main() {
  console.log('🎨 Gerando assets de marca:', SRC);
  const master = await prepareMaster();

  const sizes = {
    16: 'favicon-16x16.png',
    32: 'favicon-32x32.png',
    48: 'favicon.png',
    180: 'apple-touch-icon.png',
    80: path.join('brand', 'logo.png'),
    160: path.join('brand', 'logo@2x.png'),
  };

  const icoBuffers = [];

  for (const [size, filename] of Object.entries(sizes)) {
    const px = Number(size);
    const out = path.join(PUBLIC, filename);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const buf = await resizePng(master, px);
    fs.writeFileSync(out, buf);
    if (px === 16 || px === 32) icoBuffers.push(buf);
    console.log(`  ✓ ${filename} (${px}×${px})`);
  }

  const ico = await toIco(icoBuffers);
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico);
  console.log('  ✓ favicon.ico');

  const manifest = {
    name: 'Metamensagem',
    short_name: 'Metamensagem',
    description: 'Mente, Mensagem e Mudança',
    icons: [
      { src: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    theme_color: '#A855F7',
    background_color: '#000000',
    display: 'standalone',
  };
  fs.writeFileSync(
    path.join(PUBLIC, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('  ✓ site.webmanifest');
  console.log('✅ Concluído.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
