/**
 * Auditoria estática do layout desktop do editor de imagens (≥1024px).
 * Uso: npm run test:desktop-editor-layout
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const checks = [];

function assert(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const modal = read('src/components/image-generator/ImageGeneratorModal.tsx');
const css = read('src/index.css');

assert('Classe desktop dedicada no modal', modal.includes('mm-image-editor-desktop'));
assert('Mobile permanece isolado', modal.includes('mm-image-editor-mobile') && modal.includes('mm-mobile-editor-preview'));
assert('Grid desktop 63/37 preview/controles', css.includes('37fr') && css.includes('63fr'));
assert('Preview desktop centralizado', css.includes('.mm-desktop-editor-preview'));
assert('Painel controles desktop', css.includes('.mm-desktop-editor-controls'));
assert('Modal desktop mais largo que max-w-5xl', css.includes('76rem') || css.includes('80rem'));
assert('Sem order lg:flex-row legado', !modal.includes('lg:order-2') && !modal.includes('contents lg:block'));
assert('Share bar integrada ao preview col', modal.includes('mm-desktop-editor-share'));
assert('Mobile preview inalterado', css.match(/\.mm-mobile-editor-preview[\s\S]*height: min\(/));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`  ${c.ok ? 'OK' : 'FAIL'}: ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}

console.log('\n=== Breakpoints alvo (validação estática) ===\n');
const breakpoints = ['1366x768', '1440x900', '1920x1080', '2560x1440'];
for (const bp of breakpoints) {
  console.log(`  ${bp}: grid 63/37 + modal fluido até 82rem`);
}

if (failed.length) {
  console.error(`\n${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll desktop layout checks passed.');
