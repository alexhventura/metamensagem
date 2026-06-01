/**
 * CLI — importação completa de frases via APIs.
 *
 * Uso:
 *   npx tsx scripts/import-frases-pipeline.ts
 *   npx tsx scripts/import-frases-pipeline.ts --limit 50
 *   npx tsx scripts/import-frases-pipeline.ts --dry-run
 */

import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runQuoteImportPipeline } from '../lib/api/quoteImportPipeline';
import { hasCuradoriaKeyConfigured, getCuradoriaAiProvider } from '../lib/secrets/loadCuradoriaApiKey';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// dotenv v17 pode não injetar .env.local; loadGeminiApiKey lê o arquivo diretamente.
for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 50 : 50;
const noRebuild = args.includes('--no-rebuild');

async function main() {
  console.log('🚀 Pipeline de importação de frases (API → transform → validate → content/)\n');

  const result = await runQuoteImportPipeline({
    maxTotal: limit,
    limitPerSource: Math.ceil(limit / 4),
    dryRun,
    rebuild: !noRebuild,
    sources: ['wikiquote', 'dummyjson', 'zenquotes', 'quotable', 'ninjas'],
  });

  console.log('\n📊 Resultado:');
  console.log(`   Buscadas (novas): ${result.fetched}`);
  console.log(`   Transformadas:    ${result.transformed}`);
  console.log(`   Validadas:        ${result.validated}`);
  console.log(`   Rejeitadas:       ${result.rejected}`);
  console.log(`   Gravadas:         ${result.persisted}`);
  console.log(`   Total no mestre:  ${result.masterTotal}`);
  if (dryRun) console.log('\n(dry-run — nada gravado)');
  if (!hasCuradoriaKeyConfigured()) {
    console.warn(
      '\n⚠️ Chave de curadoria ausente — explicações usam texto padrão.\n' +
        '   Defina SECRETS_PASSPHRASE + npm run secrets:set-openai\n' +
        '   ou http://localhost:3001/dev/chaves (next:dev).'
    );
  } else {
    console.log(`\n🤖 Curadoria IA: ${getCuradoriaAiProvider()}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
