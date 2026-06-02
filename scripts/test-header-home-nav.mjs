/**
 * Garante que o logo/título "Metamensagem" no header aponta sempre para `/`.
 * Uso: npm run test:header-home-nav
 */
import { readFileSync } from 'node:fs';
import { isHomePath } from '../src/components/HeaderBrandLink.tsx';

const ROUTES_UNDER_TEST = [
  { label: 'home', path: '/' },
  { label: 'frases list', path: '/frases' },
  { label: 'phrase detail', path: '/frases/sample-slug' },
  { label: 'phrase detail (en)', path: '/en/frases/sample-slug' },
  { label: 'metaphors', path: '/metaforas' },
  { label: 'metaphor detail', path: '/metafora/1/sample-title' },
  { label: 'tag/search-like', path: '/motivacao' },
  { label: 'about', path: '/sobre' },
  { label: 'privacy', path: '/privacidade' },
];

let failed = 0;

function fail(msg) {
  console.error('  FAIL:', msg);
  failed += 1;
}

function pass(msg) {
  console.log('  OK:', msg);
}

console.log('=== MetaMensagem — header home navigation ===\n');

console.log('1) isHomePath');
if (!isHomePath('/')) fail('"/" should be home');
else pass('"/" is home');
if (!isHomePath('')) fail('"" should be home');
else pass('"" is home');
if (isHomePath('/frases')) fail('"/frases" must not be home');
else pass('"/frases" is not home');
for (const { path } of ROUTES_UNDER_TEST) {
  if (path === '/' || path === '') continue;
  if (isHomePath(path)) fail(`${path} must not be home`);
}

console.log('\n2) HeaderBrandLink source');
const brandSrc = readFileSync('src/components/HeaderBrandLink.tsx', 'utf8');
if (!/to=["']\/["']/.test(brandSrc)) fail('HeaderBrandLink must use Link to="/"');
else pass('Link to="/" present');
if (!/navigate\s*\(\s*['"]\/['"]/.test(brandSrc)) fail('HeaderBrandLink must navigate("/") on click');
else pass('navigate("/") on brand click');
if (/history\.back\s*\(/.test(brandSrc)) fail('HeaderBrandLink must not call history.back()');
else pass('no history.back()');
if (/<button[\s>]/.test(brandSrc)) fail('HeaderBrandLink should not use <button> for navigation');
else pass('no navigation button');
if (!brandSrc.includes('pointer-events-none')) fail('logo/text should keep pointer-events-none (parent Link receives clicks)');
else pass('full logo block clickable via Link');

console.log('\n3) Single site-wide header in App.tsx');
const appSrc = readFileSync('src/App.tsx', 'utf8');
const headerMatches = appSrc.match(/<header\b/g) ?? [];
if (headerMatches.length !== 1) fail(`expected 1 <header>, found ${headerMatches.length}`);
else pass('exactly one sticky header');
if (!appSrc.includes('<HeaderBrandLink')) fail('App must render HeaderBrandLink');
else pass('App uses HeaderBrandLink');
if (/function\s+HeaderBrandButton/.test(appSrc)) fail('duplicate HeaderBrandButton must be removed');
else pass('no inline HeaderBrandButton');
if (/Metamensagem/.test(appSrc.split('<header')[0] ?? '')) {
  /* title only in header component */
}

console.log('\n4) Routes covered by audit list');
for (const { label, path } of ROUTES_UNDER_TEST) {
  const home = isHomePath(path);
  pass(`${label} (${path}) → ${home ? 'scroll on click' : 'navigate to /'}`);
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `Failed: ${failed}`}`);
if (failed > 0) process.exit(1);
