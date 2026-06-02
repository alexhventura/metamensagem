/**
 * Valida o pipeline de download PNG/JPG (estático).
 * Uso: npm run test:export-download
 */
import { readFileSync } from 'node:fs';

const exportSrc = readFileSync('src/components/image-generator/exportImage.ts', 'utf8');
const modalSrc = readFileSync('src/components/image-generator/ImageGeneratorModal.tsx', 'utf8');

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

if (!/a\.download\s*=/.test(exportSrc)) fail('missing anchor download attribute');
else ok('anchor download attribute');

if (!exportSrc.includes('domToBlob')) fail('missing domToBlob capture');
else ok('domToBlob capture');

if (!exportSrc.includes('requestFileSaveHandle')) fail('missing showSaveFilePicker path');
else ok('showSaveFilePicker (requestFileSaveHandle)');

if (!exportSrc.includes('saveBlobToDisk')) fail('missing saveBlobToDisk');
else ok('saveBlobToDisk');

if (!exportSrc.includes('exportDebug')) fail('missing export debug logs');
else ok('export debug logging');

if (!modalSrc.includes('requestFileSaveHandle')) fail('modal must request save handle on click');
else ok('modal requests save handle before capture');

if (!modalSrc.includes('saveBlobToDisk')) fail('modal must call saveBlobToDisk');
else ok('modal calls saveBlobToDisk');

if (/window\.open\s*\([^)]*blob/i.test(exportSrc)) fail('must not window.open blob URL');
else ok('no window.open for blob');

if (modalSrc.includes('-z-10')) fail('export node must not use -z-10 (breaks capture)');
else ok('export node not at -z-10');

console.log(`\n${failed === 0 ? 'All checks passed.' : `Failed: ${failed}`}`);
if (failed > 0) process.exit(1);
