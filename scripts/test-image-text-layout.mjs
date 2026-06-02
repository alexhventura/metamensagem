/**
 * Testa integridade do texto no gerador de imagens (sem truncar).
 * Uso: npx tsx scripts/test-image-text-layout.mjs
 */
import { FORMATS, FORMAT_ORDER } from '../src/components/image-generator/formats.ts';
import {
  computeImageLayout,
  validateFullText,
  normalizeQuoteText,
  wrapQuoteFull,
  LONG_QUOTE_CHAR_THRESHOLD,
} from '../src/components/image-generator/utils/textLayout.ts';

const DEMO_QUOTE =
  'At its most basic the democratic contract is a simple one: the right to vote comes with a responsibility to society, through tax payments and citizenship.';

const EXTRA_LONG =
  'At its most basic the democratic contract is a simple one: the right to vote comes with a responsibility to society, through tax payments and citizenship. Democracy only works when citizens understand that rights and duties travel together through generations.';

const PT_QUOTE =
  'A democracia, em sua forma mais básica, é um contrato simples: o direito de votar vem com a responsabilidade para com a sociedade, por meio de impostos e cidadania.';

const AUTHOR = 'Victor Shamas';

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

console.log('=== MetaMensagem — testes de layout de imagem ===\n');

console.log('1) wrapQuoteFull nunca usa reticências');
const wrapped = wrapQuoteFull(DEMO_QUOTE, 900, 28);
assert(!hasEllipsis(wrapped), 'linhas contêm reticências');
assert(validateFullText(DEMO_QUOTE, wrapped), 'wrap não preserva texto');

console.log('\n2) Frase demo (inglês) — todos os formatos');
const rows = [];
for (const key of FORMAT_ORDER) {
  const { width, height, label } = FORMATS[key];
  const plan = computeImageLayout(DEMO_QUOTE, AUTHOR, width, height);
  const ok = validateFullText(DEMO_QUOTE, plan.lines);
  const joined = normalizeQuoteText(plan.lines.join(' '));
  const orig = normalizeQuoteText(DEMO_QUOTE);
  const fits =
    plan.lines.length * plan.lineHeight +
      (AUTHOR ? plan.gapQuoteAuthor + plan.authorPx * 1.28 : 0) <=
    plan.safe.quoteHeight - plan.authorBottomGap;

  assert(ok, `${key}: validateFullText`);
  assert(!hasEllipsis(plan.lines), `${key}: ellipsis nas linhas`);
  assert(joined === orig, `${key}: texto diferente (${joined.length} vs ${orig.length})`);
  assert(plan.fullTextVerified, `${key}: fullTextVerified`);

  rows.push({
    formato: label,
    key,
    ok: ok && !hasEllipsis(plan.lines),
    linhas: plan.lines.length,
    fontePx: plan.quotePx,
    longMode: plan.longQuoteMode,
    gapAutor: plan.authorBottomGap,
  });
}
console.table(rows);

console.log('\n3) Frase extra longa (~2x demo)');
for (const key of ['feed', 'facebook', 'wallpaper_mobile']) {
  const { width, height } = FORMATS[key];
  const plan = computeImageLayout(EXTRA_LONG, AUTHOR, width, height);
  const ok = validateFullText(EXTRA_LONG, plan.lines);
  assert(ok, `${key} extra longa`);
  console.log(
    `  ${key}: ${ok ? 'OK' : 'FAIL'} | ${plan.lines.length} linhas @ ${plan.quotePx}px | long=${plan.longQuoteMode}`
  );
}

console.log('\n4) Frase PT com acentos');
{
  const plan = computeImageLayout(PT_QUOTE, AUTHOR, 1080, 1080);
  assert(validateFullText(PT_QUOTE, plan.lines), 'PT validate');
  assert(plan.longQuoteMode === PT_QUOTE.length >= LONG_QUOTE_CHAR_THRESHOLD, 'long mode PT');
}

console.log('\n5) Casos limite');
assert(validateFullText('', ['']), 'texto vazio');
const oneWord = 'Supercalifragilisticexpialidocious';
const planWord = computeImageLayout(oneWord, '', 1080, 1080);
assert(validateFullText(oneWord, planWord.lines), 'palavra gigante');
assert(!hasEllipsis(planWord.lines), 'palavra gigante com ellipsis');

console.log(`\n=== Resultado: ${passed} ok, ${failed} falhas ===`);
if (failed > 0) process.exit(1);
