/**
 * Verificações estáticas pré-commit (sem browser).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);

const { shouldTranslateAuthor } = await import(
  pathToFileURL(new URL('src/lib/translation/authorPolicy.ts', root).pathname).href
);

assert.equal(shouldTranslateAuthor('Albert Einstein'), false);
assert.equal(shouldTranslateAuthor('Alberto Einstein'), false);
assert.equal(shouldTranslateAuthor('Anônimo'), true);
assert.equal(shouldTranslateAuthor('Desconhecido'), true);
assert.equal(shouldTranslateAuthor('Autor desconhecido'), true);
assert.equal(shouldTranslateAuthor('Provérbio Chinês'), true);
assert.equal(shouldTranslateAuthor('Sabedoria Popular'), true);

const localesTs = readFileSync(new URL('lib/i18n/locales.ts', root), 'utf8');
assert.match(localesTs, /'de'.*'it'.*'ja'.*'hi'/s);

const routesTs = readFileSync(new URL('src/lib/i18nRoutes.ts', root), 'utf8');
assert.ok(routesTs.includes('HREFLANG_MAP'));
assert.ok(routesTs.includes("ja: 'ja'"));
assert.ok(routesTs.includes("hi: 'hi'"));

const globalSeo = readFileSync(new URL('src/lib/globalSeoClient.ts', root), 'utf8');
assert.ok(globalSeo.includes('SEO_LOCALES'));

const imageFonts = readFileSync(
  new URL('src/components/image-generator/utils/imageFonts.ts', root),
  'utf8'
);
assert.ok(imageFonts.includes('Noto Sans JP'));
assert.ok(imageFonts.includes('Noto Sans Devanagari'));

const engine = readFileSync(new URL('src/lib/translation/translationEngine.ts', root), 'utf8');
assert.ok(engine.includes('shouldTranslateAuthor'));

console.log('verify-i18n-checklist: OK');
console.log('- Albert Einstein não traduz autor');
console.log('- Anônimo / Sabedoria Popular traduzem autor');
console.log('- SEO_LOCALES com de, it, ja, hi');
console.log('- Fontes Noto para exportação JA/HI');
