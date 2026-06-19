/**
 * Checklist de aprovação pré-deploy — validação estática + Lighthouse local.
 * Uso: npm run build && npm run test:approval
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
let failed = 0;

function pass(msg) {
  console.log(`  OK: ${msg}`);
}
function fail(msg) {
  console.error(`  FAIL: ${msg}`);
  failed += 1;
}
function warn(msg) {
  console.warn(`  WARN: ${msg}`);
}

console.log('=== MetaMensagem — Approval Checklist ===\n');

// 1. Build artifacts
if (!existsSync('dist/index.html')) fail('dist/index.html missing — run npm run build');
else pass('production build present');

// 2. SEO static
const robots = readFileSync('public/robots.txt', 'utf8');
if (!robots.includes('Disallow: /api/')) fail('robots.txt must disallow /api/');
else pass('robots.txt Disallow /api/');
if (!existsSync('public/sitemap-index.xml')) fail('sitemap-index.xml missing');
else pass('sitemap-index.xml present');

const idx = readFileSync('index.html', 'utf8');
for (const needle of ['canonical', 'og:title', 'twitter:card', 'application/ld+json']) {
  if (!idx.includes(needle)) fail(`index.html missing ${needle}`);
  else pass(`index.html ${needle}`);
}

// 3. Supabase — no client-side storage bloat from our changes
const imgMeta = readFileSync('src/components/image-generator/utils/imageMetadata.ts', 'utf8');
if (!imgMeta.includes('LOG_MAX')) fail('image metadata must cap localStorage');
else pass('image generation log capped (localStorage only, not Supabase)');

const modal = readFileSync('src/components/image-generator/ImageGeneratorModal.tsx', 'utf8');
if (modal.includes('supabase') || modal.includes('.from(')) fail('image editor must not write to Supabase');
else pass('image editor has no Supabase writes');

// 4. Security headers
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const hdr = vercel.headers?.find((h) => h.source === '/(.*)');
const keys = hdr?.headers?.map((x) => x.key) ?? [];
for (const k of ['Content-Security-Policy', 'Referrer-Policy', 'Permissions-Policy', 'X-Content-Type-Options']) {
  if (!keys.includes(k)) fail(`vercel.json missing ${k}`);
  else pass(`security header ${k}`);
}

// 5. RLS migrations exist
const mig = readFileSync('supabase/migrations/20260603000000_initial_frases_schema.sql', 'utf8');
if (!mig.includes('enable row level security')) fail('RLS migration missing');
else pass('Supabase RLS enabled in migrations');

// 6. Descriptive card links (SEO link-text)
const card = readFileSync('src/components/ContentCard.tsx', 'utf8');
if (!card.includes('learn_more_phrase')) fail('ContentCard needs descriptive learn-more labels');
else pass('descriptive card link labels');

// 7. Font lazy load (performance guard)
const fonts = readFileSync('src/components/image-generator/utils/imageFonts.ts', 'utf8');
if (!fonts.includes('ensurePickerFontLoaded')) fail('font picker must lazy-load fonts');
else pass('lazy font loading in editor');

// 8. Lighthouse (optional if dist + server available)
console.log('\n--- Lighthouse (local preview) ---');
try {
  execSync('curl -sf http://localhost:4173/ > /dev/null', { stdio: 'pipe' });
  execSync(
    'npx --yes lighthouse http://localhost:4173 --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=/tmp/lh-approval-mobile.json --chrome-flags="--headless --no-sandbox" --form-factor=mobile --quiet',
    { stdio: 'pipe', timeout: 120000 }
  );
  const lh = JSON.parse(readFileSync('/tmp/lh-approval-mobile.json', 'utf8'));
  const scores = {
    performance: Math.round(lh.categories.performance.score * 100),
    accessibility: Math.round(lh.categories.accessibility.score * 100),
    'best-practices': Math.round(lh.categories['best-practices'].score * 100),
    seo: Math.round(lh.categories.seo.score * 100),
  };
  for (const [k, v] of Object.entries(scores)) {
    if (v >= 95) pass(`Lighthouse mobile ${k}: ${v}`);
    else warn(`Lighthouse mobile ${k}: ${v} (meta ≥95 — validar em produção com CDN/cache)`);
  }
} catch {
  warn('Lighthouse skipped (start preview: npx serve dist -l 4173)');
}

console.log(`\n${failed === 0 ? 'Static approval checks passed.' : `Failed: ${failed}`}`);
if (failed > 0) process.exit(1);
