/**
 * Auditoria estática da composição visual das artes (v4).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const checks = [];
function assert(name, ok) {
  checks.push({ name, ok });
}

const formats = read('src/components/image-generator/formats.ts');
const layout = read('src/components/image-generator/utils/textLayout.ts');
const safe = read('src/components/image-generator/utils/safeZone.ts');
const renderer = read('src/components/image-generator/ImageRenderer.tsx');

assert('Apenas 3 formatos ativos', formats.includes("FORMAT_ORDER: ImageFormat[] = ['portrait', 'feed', 'story']"));
assert('Default 4:5 portrait', formats.includes("DEFAULT_FORMAT: ImageFormat = 'portrait'"));
assert('Quebra balanceada', layout.includes('lineBalanceScore') && layout.includes('fixOrphanLines'));
assert('Rodapé compacto MTA', layout.includes('formatFooterSignature') && layout.includes('MTA-'));
assert('Zonas por formato', safe.includes('FORMAT_ZONE_BASE') && safe.includes('formatProfile'));
assert('Render v4', renderer.includes('soft-premium-signature-v4'));
assert('Rodapé linha única', renderer.includes('formatFooterSignature') && !renderer.includes('metaLineLabel'));
assert('Logo discreto', renderer.includes('opacity-[0.28]'));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`  ${c.ok ? 'OK' : 'FAIL'}: ${c.name}`);
}
if (failed.length) process.exit(1);
console.log('\nAll composition checks passed.');
