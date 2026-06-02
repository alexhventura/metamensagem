/**
 * Testa integridade do texto no gerador de imagens (sem truncar).
 * Uso: npm run test:image-layout
 */
import { FORMATS, FORMAT_ORDER } from '../src/components/image-generator/formats.ts';
import {
  computeImageLayout,
  validateFullText,
  normalizeQuoteText,
  wrapQuoteFull,
  estimateRenderedBlockHeight,
  LONG_QUOTE_CHAR_THRESHOLD,
  EXTREME_QUOTE_CHAR_THRESHOLD,
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
    assert(est <= usableHeight(plan) + 2, `${key}: altura estimada na zona`);
    if (sample.text.length >= EXTREME_QUOTE_CHAR_THRESHOLD) {
      assert(plan.extremeQuoteMode, `${key}: extreme mode`);
    } else if (sample.text.length >= LONG_QUOTE_CHAR_THRESHOLD) {
      assert(plan.longQuoteMode, `${key}: long mode`);
    }
  }
}

console.log('\n3) Frase demo — tabela resumo (feed)');
const rows = [];
for (const key of ['feed', 'story', 'facebook', 'wallpaper_mobile']) {
  const { width, height, label } = FORMATS[key];
  const plan = computeImageLayout(DEMO_QUOTE, AUTHOR, width, height);
  rows.push({
    formato: label,
    quoteFits: plan.quoteFits,
    linhas: plan.lines.length,
    fontePx: plan.quotePx,
    long: plan.longQuoteMode,
    extreme: plan.extremeQuoteMode,
  });
}
console.table(rows);

console.log(`\n=== Resultado: ${passed} ok, ${failed} falhas ===`);
if (failed > 0) process.exit(1);
