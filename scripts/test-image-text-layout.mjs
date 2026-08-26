/**
 * Testa integridade do texto no gerador de imagens (sem truncar).
 * Uso: npm run test:image-layout
 */
import { FORMATS, FORMAT_ORDER } from '../src/components/image-generator/formats.ts';
import {
  computeImageLayout,
  computeFooterFontSize,
  validateFullText,
  normalizeQuoteText,
  wrapQuoteFull,
  estimateRenderedBlockHeight,
  formatFooterSignature,
  formatSerialCompact,
  FOOTER_META_MIN_PX,
  LONG_QUOTE_CHAR_THRESHOLD,
  EXTREME_QUOTE_CHAR_THRESHOLD,
  MIN_LINE_HEIGHT_RATIO,
} from '../src/components/image-generator/utils/textLayout.ts';

const DEMO_QUOTE =
  'At its most basic the democratic contract is a simple one: the right to vote comes with a responsibility to society, through tax payments and citizenship.';

const AUTHOR = 'Victor Shamas';

function buildQuote(targetChars) {
  const base =
    'A democracia exige cidadania ativa, responsabilidade coletiva e respeito às instituições. ';
  let s = '';
  while (s.length < targetChars) s += base;
  return s.slice(0, targetChars).trim();
}

const SAMPLES = [
  { label: '50 chars', text: buildQuote(50) },
  { label: '150 chars', text: buildQuote(150) },
  { label: '300 chars', text: buildQuote(300) },
  { label: '500 chars', text: buildQuote(500) },
  { label: 'demo EN', text: DEMO_QUOTE },
];

let failed = 0;
let passed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('  FAIL:', msg);
    failed += 1;
    return false;
  }
  passed += 1;
  return true;
}

function hasEllipsis(lines) {
  return lines.some((l) => /…|\.\.\./.test(l));
}

function usableHeight(plan) {
  return plan.zones.quoteZoneHeight - 20;
}

console.log('=== MetaMensagem — testes de layout de imagem ===\n');

console.log('1) wrapQuoteFull nunca usa reticências');
const wrapped = wrapQuoteFull(DEMO_QUOTE, 900, 28);
assert(!hasEllipsis(wrapped), 'linhas contêm reticências');
assert(validateFullText(DEMO_QUOTE, wrapped), 'wrap não preserva texto');

console.log('\n1b) Quebra balanceada evita linha órfã (1 palavra)');
const orphanSample =
  'A vida é feita de escolhas pequenas que constroem grandes transformações ao longo do tempo.';
const balanced = wrapQuoteFull(orphanSample, 620, 42);
const orphanLines = balanced.filter((l) => l.split(' ').filter(Boolean).length === 1);
assert(orphanLines.length <= 1, `linhas órfãs=${orphanLines.length}`);

console.log('\n1c) Rodapé compacto');
assert(formatFooterSignature('MMM-2026-00048392').includes('metamensagem.com • MTA-'), 'footer signature');
assert(formatSerialCompact('MMM-2026-00048392') === 'MTA-2026-48392', 'serial compact');

console.log('\n2) Amostras 50 / 150 / 300 / 500 chars × todos os formatos');
for (const sample of SAMPLES) {
  console.log(`\n  — ${sample.label} (${sample.text.length} caracteres)`);
  for (const key of FORMAT_ORDER) {
    const { width, height } = FORMATS[key];
    const plan = computeImageLayout(sample.text, AUTHOR, width, height);
    const ok = validateFullText(sample.text, plan.lines);
    const est = estimateRenderedBlockHeight(plan.lines.length, plan.quotePx, plan.lineHeight);
    assert(ok, `${key}: validateFullText`);
    assert(!hasEllipsis(plan.lines), `${key}: ellipsis`);
    assert(plan.quoteFits, `${key}: quoteFits`);
    assert(
      plan.lineHeightRatio >= MIN_LINE_HEIGHT_RATIO,
      `${key}: lineHeightRatio ${plan.lineHeightRatio} < ${MIN_LINE_HEIGHT_RATIO}`
    );
    assert(est <= usableHeight(plan) + 2, `${key}: altura estimada na zona`);
    if (sample.text.length >= EXTREME_QUOTE_CHAR_THRESHOLD) {
      assert(plan.extremeQuoteMode, `${key}: extreme mode`);
    } else if (sample.text.length >= LONG_QUOTE_CHAR_THRESHOLD) {
      assert(plan.longQuoteMode, `${key}: long mode`);
    }
  }
}

console.log('\n3) Frase demo — tabela resumo (3 formatos)');
const rows = [];
for (const key of FORMAT_ORDER) {
  const { width, height, label } = FORMATS[key];
  const plan = computeImageLayout(DEMO_QUOTE, AUTHOR, width, height);
  const quoteAreaRatio = (plan.zones.quoteZoneHeight / height).toFixed(2);
  rows.push({
    formato: label,
    quoteFits: plan.quoteFits,
    linhas: plan.lines.length,
    fontePx: plan.quotePx,
    zonaFrase: quoteAreaRatio,
    long: plan.longQuoteMode,
  });
}
console.table(rows);

console.log('\n4) Textos longos sempre permitem exportação (quoteFits)');
const huge = buildQuote(800);
for (const key of FORMAT_ORDER) {
  const { width, height, label } = FORMATS[key];
  const plan = computeImageLayout(huge, AUTHOR, width, height);
  if (!plan.quoteFits || !plan.fullTextVerified) {
    failed += 1;
    console.error(`  FAIL: ${label} quoteFits=${plan.quoteFits} px=${plan.quotePx}`);
  } else {
    passed += 1;
  }
}
if (failed === 0) console.log('  OK: todos os formatos com 800 chars');

console.log('\n5) Rodapé legível (marca)');
const storyFooter = computeFooterFontSize(1080, 1920);
const feedFooter = computeFooterFontSize(1080, 1080);
if (storyFooter < FOOTER_META_MIN_PX || feedFooter < FOOTER_META_MIN_PX) {
  failed += 1;
  console.error(`  FAIL: footer px story=${storyFooter} feed=${feedFooter} (min ${FOOTER_META_MIN_PX})`);
} else {
  passed += 1;
  console.log(`  OK: footer px story=${storyFooter} feed=${feedFooter}`);
}

console.log(`\n=== Resultado: ${passed} ok, ${failed} falhas ===`);
if (failed > 0) process.exit(1);
