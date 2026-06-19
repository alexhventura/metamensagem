/**
 * Auditoria estática do dark mode — tokens e contraste.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');

const checks = [];
function assert(name, ok) {
  checks.push({ name, ok });
}

assert('Tokens dark warm', css.includes('--mm-fg-muted') && css.includes('#0f0e0c'));
assert('Bordas dark editor', css.includes('--mm-border-strong'));
assert('Feed load more dark', css.includes('.mm-feed-load-more'));
assert('Skin labels dark', css.includes('.mm-skin-label'));
assert('Mobile editor bar dark', css.includes('html[data-theme="dark"] .mm-editor-mobile-bar'));
assert('Placeholder dark', css.includes('html[data-theme="dark"] input::placeholder'));

const inverted = fs.readFileSync(path.join(ROOT, 'src/components/SocialHub.tsx'), 'utf8');
assert('SocialHub não usa zinc-600 no dark', !inverted.includes("'text-zinc-600'"));

const modal = fs.readFileSync(
  path.join(ROOT, 'src/components/image-generator/ImageGeneratorModal.tsx'),
  'utf8'
);
assert('Modal dark border legível', modal.includes('border-zinc-700'));

const serial = fs.readFileSync(
  path.join(ROOT, 'src/components/image-generator/utils/textLayout.ts'),
  'utf8'
);
assert('Serial MTA com ano', serial.includes('MTA-${year}-'));

const formats = fs.readFileSync(path.join(ROOT, 'src/components/image-generator/formats.ts'), 'utf8');
assert('3 formatos ativos', formats.includes("['portrait', 'feed', 'story']"));

for (const c of checks) console.log(`  ${c.ok ? 'OK' : 'FAIL'}: ${c.name}`);
if (checks.some((c) => !c.ok)) process.exit(1);
console.log('\nAll dark mode checks passed.');
