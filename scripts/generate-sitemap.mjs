/**
 * Gera public/sitemap.xml a partir de metaforas-index.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const SITE = 'https://metamensagem.com';

function slugFromTitulo(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlEntry(loc, priority = '0.8', changefreq = 'monthly') {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/frases', priority: '0.9', changefreq: 'weekly' },
  { path: '/metaforas', priority: '0.9', changefreq: 'weekly' },
  { path: '/sobre', priority: '0.5', changefreq: 'yearly' },
  { path: '/privacidade', priority: '0.3', changefreq: 'yearly' },
  { path: '/termos', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookies', priority: '0.3', changefreq: 'yearly' },
];

const TAG_URL_PREFIX = 'mensagens-de';

const indexPath = path.join(PUBLIC, 'metaforas-index.json');
const frasesIndexPath = path.join(PUBLIC, 'frases-index.json');
if (!fs.existsSync(indexPath)) {
  console.warn('⚠ metaforas-index.json ausente; sitemap só com páginas estáticas.');
}

const metaforas = fs.existsSync(indexPath)
  ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  : [];

const frases = fs.existsSync(frasesIndexPath)
  ? JSON.parse(fs.readFileSync(frasesIndexPath, 'utf8'))
  : [];

/** Slugs únicos de tags (mescla variantes como Reflexão / Reflexao). */
function collectTagSlugs(items) {
  const slugs = new Set();
  for (const item of items) {
    for (const tag of item.tags || []) {
      const slug = slugFromTitulo(tag);
      if (slug) slugs.add(slug);
    }
  }
  return [...slugs].sort();
}

const tagSlugs = collectTagSlugs([...metaforas, ...frases]);
const tagPages = tagSlugs.map((slug) =>
  urlEntry(`${SITE}/${TAG_URL_PREFIX}-${slug}`, '0.85', 'weekly')
);

const TAG_PATH_ALIASES = {
  'frases-motivacionais': 'motivacao',
  'frases-motivacao': 'motivacao',
  'metaforas-da-vida': 'metafora',
  'reflexoes-profundas': 'reflexao',
  'reflexoes-da-vida': 'reflexao',
  'frases-para-status': 'inspiracional',
  'mensagens-de-superacao': 'superacao',
  'mensagens-motivacionais': 'motivacao',
};
const aliasPages = Object.keys(TAG_PATH_ALIASES).map((path) =>
  urlEntry(`${SITE}/${path}`, '0.84', 'weekly')
);

const entries = [
  ...staticPages.map((p) => urlEntry(`${SITE}${p.path}`, p.priority, p.changefreq)),
  ...tagPages,
  ...aliasPages,
  ...metaforas.map((m) => {
    const slug = m.titulo ? slugFromTitulo(m.titulo) : '';
    const loc = slug
      ? `${SITE}/metafora/${m.id}/${slug}`
      : `${SITE}/metafora/${m.id}`;
    return urlEntry(loc, '0.7', 'monthly');
  }),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

const out = path.join(PUBLIC, 'sitemap.xml');
fs.writeFileSync(out, xml, 'utf8');
console.log(
  `✅ sitemap.xml — ${staticPages.length} estáticas + ${tagSlugs.length} tags + ${aliasPages.length} aliases + ${metaforas.length} metáforas (${entries.length} URLs)`
);
