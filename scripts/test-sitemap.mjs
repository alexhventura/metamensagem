/**
 * Garante que sitemaps estão em XML válido para o Google Search Console.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = 'public';
const MAX_URLS = 50_000;
const MAX_BYTES = 50 * 1024 * 1024;
let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}
function pass(msg) {
  console.log(`OK: ${msg}`);
}

const robots = readFileSync(join(PUBLIC, 'robots.txt'), 'utf8');
if (!robots.includes('Sitemap: https://metamensagem.com/sitemap-index.xml')) {
  fail('robots.txt must point to sitemap-index.xml');
} else pass('robots.txt aponta para sitemap-index.xml');

for (const name of ['sitemap.xml', 'sitemap-index.xml']) {
  const xml = readFileSync(join(PUBLIC, name), 'utf8');
  if (!xml.startsWith('<?xml')) fail(`${name} must start with XML declaration`);
  else pass(`${name} starts with XML`);
  if (!xml.includes('<sitemapindex')) fail(`${name} must be a sitemapindex (not HTML/urlset)`);
  else pass(`${name} is sitemapindex`);
  if (/<html[\s>]/i.test(xml)) fail(`${name} looks like HTML`);
}

const core = readdirSync(PUBLIC).filter((f) => /^sitemap-core-\d+\.xml$/.test(f));
if (!core.length) fail('missing sitemap-core-*.xml shards');
else pass(`${core.length} core shard(s)`);

for (const name of [...core, ...readdirSync(PUBLIC).filter((f) => /^sitemap-[a-z]{2}\.xml$/.test(f))]) {
  const file = join(PUBLIC, name);
  if (!existsSync(file)) continue;
  const size = statSync(file).size;
  const xml = readFileSync(file, 'utf8');
  const urls = (xml.match(/<url>/g) || []).length;
  if (size > MAX_BYTES) fail(`${name} exceeds 50MB (${(size / 1e6).toFixed(1)}MB)`);
  else if (urls > MAX_URLS) fail(`${name} has ${urls} URLs (max ${MAX_URLS})`);
  else pass(`${name} ${urls} URLs, ${(size / 1e6).toFixed(1)}MB`);
  if (!xml.includes('<urlset')) fail(`${name} missing urlset`);
}

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const rewrite = vercel.rewrites?.find((r) => r.source === '/sitemap');
if (!rewrite || rewrite.destination !== '/sitemap-index.xml') {
  fail('vercel.json must rewrite /sitemap to sitemap-index.xml');
} else pass('rewrite /sitemap → sitemap-index.xml');

if (failed) {
  console.error(`\n${failed} sitemap check(s) failed`);
  process.exit(1);
}
console.log('\nAll sitemap checks passed');
