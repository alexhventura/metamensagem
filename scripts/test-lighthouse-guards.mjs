/**
 * Garantias de performance/a11y/segurança alinhadas ao audit Lighthouse.
 */
import { readFileSync } from 'node:fs';

let failed = 0;
function fail(msg) {
  console.error('  FAIL:', msg);
  failed += 1;
}
function pass(msg) {
  console.log('  OK:', msg);
}

console.log('=== MetaMensagem — lighthouse guards ===\n');

const feed = readFileSync('src/lib/feedWithAds.ts', 'utf8');
if (!feed.includes('FEED_INITIAL_VISIBLE = FEED_CARDS_PER_AD_BREAK')) {
  fail('initial feed must be 6 cards (FEED_CARDS_PER_AD_BREAK)');
} else pass('FEED_INITIAL_VISIBLE = 6');

const app = readFileSync('src/App.tsx', 'utf8');
if (app.includes('GoogleAdSense')) fail('App must not mount global AdSense on load');
else pass('no global GoogleAdSense in App');

if (!app.includes('id="main-content"')) fail('main landmark id required');
else pass('main-content landmark');

const content = readFileSync('src/components/ContentCard.tsx', 'utf8');
if (!content.includes('aria-label={t(\'common.share\')}')) {
  fail('share button needs aria-label');
} else pass('share button aria-label');

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const globalHdr = vercel.headers?.find((h) => h.source === '/(.*)');
const keys = globalHdr?.headers?.map((x) => x.key) ?? [];
for (const k of ['Content-Security-Policy', 'Referrer-Policy', 'Permissions-Policy']) {
  if (!keys.includes(k)) fail(`vercel.json missing ${k}`);
  else pass(`header ${k}`);
}

const idx = readFileSync('index.html', 'utf8');
if (!idx.includes('preload') || !idx.includes('/brand/logo.svg')) {
  fail('preload logo in index.html');
} else pass('logo preload');

console.log(`\n${failed === 0 ? 'All checks passed.' : `Failed: ${failed}`}`);
if (failed > 0) process.exit(1);
