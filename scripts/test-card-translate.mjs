/**
 * Smoke-test translateCardContent for all CARD_LANG targets from English sample.
 * Usage: npx tsx scripts/test-card-translate.mjs
 */
import { translateCardContent } from '../src/lib/translation/translationEngine.ts';
import { ALL_CARD_LANGS } from '../src/lib/translation/cardLanguages.ts';

const sample = {
  texto:
    'The only way to do great work is to love what you do. If you have not found it yet, keep looking.',
  autor: 'Steve Jobs',
  explicacao:
    'A motivational quote about passion and persistence in career and life choices.',
};

const from = 'en';

async function main() {
  const results = [];
  for (const target of ALL_CARD_LANGS) {
    if (target === from) continue;
    try {
      const out = await translateCardContent(sample, target, {
        contentId: 'test-en-sample',
        skipCache: true,
        force: true,
        sourceLang: 'en',
      });
      const ok =
        out.isTranslated &&
        out.texto &&
        out.texto !== sample.texto &&
        !/MYMEMORY WARNING/i.test(out.texto);
      results.push({ target, ok, preview: out.texto?.slice(0, 60) });
      console.log(ok ? 'OK' : 'BAD', target, out.texto?.slice(0, 80));
    } catch (e) {
      results.push({ target, ok: false, error: String(e) });
      console.log('FAIL', target, e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  const failed = results.filter((r) => !r.ok);
  console.log('\nFailed:', failed.length, '/', results.length);
  if (failed.length) process.exit(1);
}

main();
