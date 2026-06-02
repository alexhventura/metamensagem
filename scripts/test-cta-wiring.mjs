/**
 * Auditoria estática dos CTAs principais do feed/detalhe/gerador.
 * Uso: npm run test:cta-wiring
 */
import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'src/components/ContentCard.tsx',
    label: 'Copiar frase',
    test: (s) => /clipboard\.writeText|writeText/.test(s) && /Copy/.test(s),
  },
  {
    file: 'src/components/ContentCard.tsx',
    label: 'Compartilhar frase',
    test: (s) => /navigator\.share|handleShare/.test(s),
  },
  {
    file: 'src/components/ContentCard.tsx',
    label: 'Gerar imagem',
    test: (s) => /ImageGeneratorModal|generate_image|Sparkles/.test(s),
  },
  {
    file: 'src/components/CardTranslateMenu.tsx',
    label: 'Traduzir frase',
    test: (s) => /translate|getOrCreatePhraseTranslation|Traduzir/i.test(s),
  },
  {
    file: 'src/components/image-generator/ShareActionBar.tsx',
    label: 'Download PNG/JPG',
    test: (s) => /onDownloadPng|onDownloadJpg/.test(s),
  },
  {
    file: 'src/components/image-generator/ImageGeneratorModal.tsx',
    label: 'Copiar imagem',
    test: (s) => /copyBlobToClipboard|handleCopy/.test(s),
  },
  {
    file: 'src/components/HeaderBrandLink.tsx',
    label: 'Logo Home',
    test: (s) => /to=["']\/["']/.test(s) && /navigate\s*\(\s*['"]\/['"]/.test(s),
  },
  {
    file: 'src/App.tsx',
    label: 'Header único',
    test: (s) => (s.match(/<header\b/g) ?? []).length === 1 && s.includes('HeaderBrandLink'),
  },
];

let failed = 0;

console.log('=== MetaMensagem — CTA wiring audit ===\n');

for (const { file, label, test } of checks) {
  const src = readFileSync(file, 'utf8');
  if (test(src)) console.log('  OK:', label, `(${file})`);
  else {
    console.error('  FAIL:', label, `(${file})`);
    failed += 1;
  }
}

console.log(`\n${failed === 0 ? 'All CTAs wired.' : `Failed: ${failed}`}`);
if (failed > 0) process.exit(1);
