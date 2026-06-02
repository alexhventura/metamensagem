/**
 * Valida o pipeline de download PNG/JPG (estático).
 * Uso: npm run test:export-download
 */
import { readFileSync } from 'node:fs';

const exportSrc = readFileSync('src/components/image-generator/exportImage.ts', 'utf8');
const modalSrc = readFileSync('src/components/image-generator/ImageGeneratorModal.tsx', 'utf8');
const measureSrc = readFileSync('src/components/image-generator/utils/measureQuoteBlock.ts', 'utf8');

let failed = 0;

function ok(msg) {
  console.log('  OK:', msg);
}
function fail(msg) {
  console.error('  FAIL:', msg);
  failed += 1;
}

console.log('=== MetaMensagem — export download pipeline ===\n');

if (!exportSrc.includes('createObjectURL')) fail('missing URL.createObjectURL');
else ok('createObjectURL');

if (!exportSrc.includes('revokeObjectURL')) fail('missing URL.revokeObjectURL');
else ok('revokeObjectURL');

if (!/anchor\.download\s*=/.test(exportSrc)) fail('missing anchor download attribute');
else ok('anchor download attribute');

if (!exportSrc.includes('appendChild(anchor)')) fail('missing appendChild before click');
else ok('appendChild before click');

if (!exportSrc.includes('removeChild(anchor)')) fail('missing removeChild after click');
else ok('removeChild after click');

if (!exportSrc.includes('domToBlob')) fail('missing modern-screenshot domToBlob');
else ok('modern-screenshot domToBlob');

if (!exportSrc.includes('saveAs')) fail('missing file-saver saveAs');
else ok('file-saver saveAs');

if (!exportSrc.includes('html-to-image')) fail('missing html-to-image fallback');
else ok('html-to-image fallback');

if (!exportSrc.includes('saveAs')) fail('missing saveAs from file-saver');
else ok('file-saver primary path');

if (!modalSrc.includes('downloadBlob')) fail('modal must call downloadBlob after capture');
else ok('modal calls downloadBlob');

if (/window\.open\s*\([^)]*blob/i.test(exportSrc)) fail('must not window.open blob URL');
else ok('no window.open for blob');

if (modalSrc.includes('visibility:') && modalSrc.includes('hidden')) fail('export node must not use visibility:hidden');
else ok('export node without visibility:hidden');

if (!measureSrc.includes('domReliable')) fail('measureQuoteBlock must skip unreliable hidden DOM rects');
else ok('domReliable guard in measureQuoteBlock');

console.log(`\n${failed === 0 ? 'All checks passed.' : `Failed: ${failed}`}`);
if (failed > 0) process.exit(1);
