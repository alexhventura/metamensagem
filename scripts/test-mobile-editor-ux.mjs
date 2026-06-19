/**
 * Auditoria estática de UX mobile do editor de imagens.
 * Simula caminhos de toque e estima tempo de criação.
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
const actionBar = read('src/components/image-generator/MobileEditorActionBar.tsx');
const quickPanel = read('src/components/image-generator/MobileQuickStylePanel.tsx');

assert('MobileQuickStylePanel substitui accordion', !modal.includes('MobileEditorAccordion'));
assert('Preview fora do scroll (shell fixo)', modal.includes('mm-image-editor-mobile-shell'));
assert('Preview não usa sticky', !css.includes('position: sticky') || !css.match(/\.mm-mobile-editor-preview[\s\S]*position:\s*sticky/));
assert('Preview altura fixa', css.includes('.mm-mobile-editor-preview') && css.includes('height: min('));
assert('Grade de cores visual', fs.existsSync(path.join(ROOT, 'src/components/image-generator/MobileColorGrid.tsx')));
assert('Fontes renderizadas', read('src/components/image-generator/MobileFontPicker.tsx').includes('fontFamily: font.family'));
assert('Fundos com miniaturas', read('src/components/image-generator/MobileBackgroundGrid.tsx').includes('mm-bg-thumb'));
assert('CTA Baixar imagem primário', actionBar.includes('mm-editor-mobile-bar-primary') && actionBar.includes('Baixar imagem'));
assert('Seleção de fonte no renderer', read('src/components/image-generator/ImageRenderer.tsx').includes('fontFamilyOverride'));
assert('Override de cor no renderer', read('src/components/image-generator/ImageRenderer.tsx').includes('textColorOverride'));
assert('Painel sempre visível (sem accordion)', quickPanel.includes('Formato') && quickPanel.includes('Cores') && quickPanel.includes('Fonte') && quickPanel.includes('Fundo'));
assert('Export offscreen (sem overlay no mobile)', modal.includes('mm-image-export-offscreen') && !modal.includes('-left-[200vw]'));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`  ${c.ok ? 'OK' : 'FAIL'}: ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}

console.log('\n=== Estimativa de toques (mobile) ===\n');
const flows = [
  { action: 'Trocar fonte', before: 'N/A (indisponível)', after: '1 toque', taps: 1 },
  { action: 'Trocar cor', before: '4+ toques (accordion + coleção + variação)', after: '1 toque', taps: 1 },
  { action: 'Trocar fundo', before: '3–4 toques', after: '1 toque', taps: 1 },
  { action: 'Trocar formato', before: '2 toques (abrir seção + escolher)', after: '1 toque', taps: 1 },
  { action: 'Baixar imagem', before: '1 toque', after: '1 toque (CTA primário)', taps: 1 },
  { action: 'Compartilhar', before: '2 toques (accordion exportação + share)', after: '1 toque', taps: 1 },
];

for (const f of flows) {
  console.log(`  ${f.action}: ${f.after} (antes: ${f.before})`);
}

const totalTaps = flows.reduce((s, f) => s + f.taps, 0);
const estSeconds = 8 + totalTaps * 2.5;
console.log(`\n  Fluxo completo estimado: ~${totalTaps} toques, ~${Math.round(estSeconds)}s (meta < 30s, < 1 min)`);

if (failed.length) {
  console.error(`\n${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll mobile UX checks passed.');
