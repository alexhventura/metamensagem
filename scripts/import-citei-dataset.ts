/**
 * Importador inteligente citei-api → Metamensagem
 *
 * Uso:
 *   npm run frases:import:citei -- --discover
 *   npm run frases:import:citei -- --quotes-file data/citei-api/dumps/quotes.json
 *   npm run frases:import:citei -- --limit 500 --no-ai
 *   npm run frases:import:citei -- --api-url https://citei.herokuapp.com/api
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { runCiteiImportPipeline } from '../lib/importers/citei/citeiImportPipeline';
import { hasCuradoriaKeyConfigured, getCuradoriaAiProvider } from '../lib/secrets/loadCuradoriaApiKey';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const discoverOnly = args.includes('--discover');
const dryRun = args.includes('--dry-run');
const noAi = args.includes('--no-ai');
const noRebuild = args.includes('--no-rebuild');

function argValue(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  console.log('🚀 Importador citei-api → Metamensagem\n');

  const result = await runCiteiImportPipeline({
    repoPath: argValue('--repo') || path.join(ROOT, 'data', 'citei-api'),
    quotesFile: argValue('--quotes-file'),
    apiBaseUrl: argValue('--api-url') || process.env.CITEI_API_URL,
    limit: argValue('--limit') ? parseInt(argValue('--limit')!, 10) : undefined,
    offset: argValue('--offset') ? parseInt(argValue('--offset')!, 10) : 0,
    dryRun,
    withAi: !noAi,
    rebuild: !noRebuild,
    discoverOnly,
  });

  console.log(result.discovery);
  console.log('');

  if (discoverOnly) return;

  if (result.quoteSource === 'none' || !result.import) {
    console.log('❌ Nenhuma frase extraída.');
    console.log(`
Coloque o dump MongoDB em:
  data/citei-api/dumps/quotes.json

Exportação (exemplo):
  mongoexport --uri="$MONGODBURL" --collection=quotes --jsonArray --out quotes.json

Ou use um arquivo exportado com --quotes-file caminho/arquivo.json
`);
    process.exit(1);
  }

  console.log(`Fonte: ${result.quoteSource} | Frases extraídas: ${result.quotesFound}`);
  console.log(`   Validadas: ${result.import.validated}`);
  console.log(`   Gravadas:  ${result.import.persisted}`);
  console.log(`   Rejeitadas: ${result.import.rejected}`);
  console.log(`   Acervo:    ${result.import.masterTotal}`);
  if (!noAi && hasCuradoriaKeyConfigured()) {
    console.log(`   Curadoria: ${getCuradoriaAiProvider()}`);
  }
  if (dryRun) console.log('\n(dry-run)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
