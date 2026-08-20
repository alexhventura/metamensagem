/**
 * Gera sitemaps do acervo principal (páginas, tags com volume e metáforas).
 * Respeita o limite do Google: 50_000 URLs por arquivo.
 * O arquivo sitemap.xml vira um índice (sitemapindex), nunca um HTML/SPA.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { absoluteUrl } from './lib/site-url.mjs';
import {
  SITEMAP_MAX_URLS,
  chunkEntries,
  escapeXml,
  sitemapIndexXml,
  urlsetXml,
} from './lib/sitemap-xml.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const SEO_LOCALES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'];
/** Tags com pouco volume geram páginas finas — o Google ignora ou penaliza. */
const MIN_TAG_COUNT = 50;

function slugFromTitulo(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
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
  { path: '/contato', priority: '0.5', changefreq: 'yearly' },
  { path: '/privacidade', priority: '0.3', changefreq: 'yearly' },
  { path: '/termos', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookies', priority: '0.3', changefreq: 'yearly' },
];

const TAG_URL_PREFIX = 'mensagens-de';

const indexPath = path.join(PUBLIC, 'metaforas-index.json');
const categoriasPath = path.join(PUBLIC, 'indices', 'categorias-index.json');

if (!fs.existsSync(indexPath)) {
  console.warn('⚠ metaforas-index.json ausente; sitemap só com páginas estáticas e tags.');
}

const metaforas = fs.existsSync(indexPath)
  ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  : [];

function collectTagSlugs() {
  const slugs = new Map();
  if (fs.existsSync(categoriasPath)) {
    const cats = JSON.parse(fs.readFileSync(categoriasPath, 'utf8'));
    for (const cat of cats) {
      const slug = String(cat.slug || '').trim();
      const count = Number(cat.count) || 0;
      if (!slug || count < MIN_TAG_COUNT) continue;
      slugs.set(slug, count);
    }
  }
  return [...slugs.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);
}

const tagSlugs = collectTagSlugs();
const tagPages = tagSlugs.map((slug) =>
  urlEntry(absoluteUrl(`/${TAG_URL_PREFIX}-${slug}`), '0.85', 'weekly')
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
const aliasPages = Object.keys(TAG_PATH_ALIASES).map((aliasPath) =>
  urlEntry(absoluteUrl(`/${aliasPath}`), '0.84', 'weekly')
);

const entries = [
  ...staticPages.map((p) => urlEntry(absoluteUrl(p.path), p.priority, p.changefreq)),
  ...tagPages,
  ...aliasPages,
  ...metaforas.map((m) => {
    const slug = m.titulo ? slugFromTitulo(m.titulo) : '';
    const loc = slug
      ? absoluteUrl(`/metafora/${m.id}/${slug}`)
      : absoluteUrl(`/metafora/${m.id}`);
    return urlEntry(loc, '0.7', 'monthly');
  }),
];

const coreFiles = [];
chunkEntries(entries, SITEMAP_MAX_URLS).forEach((chunk, i) => {
  const name = `sitemap-core-${i + 1}.xml`;
  fs.writeFileSync(path.join(PUBLIC, name), urlsetXml(chunk), 'utf8');
  coreFiles.push(name);
  console.log(`✅ ${name} — ${chunk.length} URLs`);
});

const localeFiles = SEO_LOCALES.map((lang) => `sitemap-${lang}.xml`).filter((name) =>
  fs.existsSync(path.join(PUBLIC, name))
);

const indexLocs = [...coreFiles, ...localeFiles].map((name) => absoluteUrl(`/${name}`));
const indexXml = sitemapIndexXml(indexLocs);
fs.writeFileSync(path.join(PUBLIC, 'sitemap-index.xml'), indexXml, 'utf8');
/** GSC costuma submeter /sitemap.xml — precisa ser índice XML, nunca a SPA. */
fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), indexXml, 'utf8');

console.log(
  `✅ sitemap.xml / sitemap-index.xml — ${coreFiles.length} core + ${localeFiles.length} idiomas (${entries.length} URLs no acervo principal)`
);
