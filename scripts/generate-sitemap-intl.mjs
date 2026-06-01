/**
 * Sitemaps internacionais — top 20k slugs.
 * x-default = /frases/:slug (idioma original por shard i18n-meta).
 * Rodar localmente: npm run frases:sitemap:intl
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { absoluteUrl } from './lib/site-url.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const I18N_META = path.join(PUBLIC, 'frases-v2', 'i18n-meta');
const TOP = path.join(ROOT, 'data', 'import', 'global-top-20k-slugs.json');
const SEO_LOCALES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'];

const HREFLANG = {
  pt: 'pt-BR',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'ja',
  hi: 'hi',
};

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function frasePath(slug, locale, defaultLocale) {
  if (locale === defaultLocale) return absoluteUrl(`/frases/${slug}`);
  return absoluteUrl(`/${locale}/frases/${slug}`);
}

function defaultLocaleForSlug(slug, metaIndex) {
  const row = metaIndex.get(slug.toLowerCase());
  const lang = row?.languageOriginal;
  if (lang && SEO_LOCALES.includes(lang)) return lang;
  return 'en';
}

function loadMetaIndex() {
  const index = new Map();
  if (!fs.existsSync(I18N_META)) return index;
  for (const file of fs.readdirSync(I18N_META)) {
    if (!file.startsWith('shard-') || !file.endsWith('.json')) continue;
    const shard = JSON.parse(fs.readFileSync(path.join(I18N_META, file), 'utf8'));
    for (const [slug, meta] of Object.entries(shard)) {
      if (meta?.languageOriginal) index.set(slug.toLowerCase(), meta);
    }
  }
  return index;
}

function urlEntry(loc, alternates = []) {
  const alt = alternates
    .map(
      (a) =>
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(a.lang)}" href="${escapeXml(a.href)}" />`
    )
    .join('\n');
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
${alt}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
}

function buildAlternates(slug, defaultLocale) {
  const links = SEO_LOCALES.map((loc) => ({
    lang: HREFLANG[loc],
    href: frasePath(slug, loc, defaultLocale),
  }));
  links.push({
    lang: 'x-default',
    href: frasePath(slug, defaultLocale, defaultLocale),
  });
  return links;
}

const slugs = fs.existsSync(TOP) ? JSON.parse(fs.readFileSync(TOP, 'utf8')) : [];
const metaIndex = loadMetaIndex();
console.log(`i18n-meta: ${metaIndex.size} slugs indexados para default locale`);

for (const lang of SEO_LOCALES) {
  const entries = slugs.map((slug) => {
    const def = defaultLocaleForSlug(slug, metaIndex);
    const loc = frasePath(slug, lang, def);
    return urlEntry(loc, buildAlternates(slug, def));
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.slice(0, 50000).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(PUBLIC, `sitemap-${lang}.xml`), xml);
  console.log(`sitemap-${lang}.xml — ${Math.min(slugs.length, 50000)} URLs`);
}

const sitemapRefs = [
  absoluteUrl('/sitemap.xml'),
  ...SEO_LOCALES.map((l) => absoluteUrl(`/sitemap-${l}.xml`)),
];

const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapRefs.map((loc) => `  <sitemap><loc>${escapeXml(loc)}</loc></sitemap>`).join('\n')}
</sitemapindex>`;
fs.writeFileSync(path.join(PUBLIC, 'sitemap-index.xml'), index);
console.log('✅ sitemap-index.xml (principal + idiomas)');
