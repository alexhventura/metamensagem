/**
 * Importador inteligente CSV → content/frases/
 *
 * Uso:
 *   npm run frases:import:csv -- "c:\caminho\quotes.csv"
 *   npm run frases:import:csv -- data/import/arquivo.csv --limit 500 --offset 0
 *   npm run frases:import:csv -- arquivo.csv --dry-run --limit 20
 *   npm run frases:import:csv -- arquivo.csv --no-ai --limit 2000 --offset 2000
 */

import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runCsvImportPipeline } from '../lib/importers/csvImportPipeline';
import { hasCuradoriaKeyConfigured, getCuradoriaAiProvider } from '../lib/secrets/loadCuradoriaApiKey';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noAi = args.includes('--no-ai');
const noRebuild = args.includes('--no-rebuild');
const limitIdx = args.indexOf('--limit');
const offsetIdx = args.indexOf('--offset');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0;
const offset = offsetIdx >= 0 ? parseInt(args[offsetIdx + 1], 10) : 0;
const fileArg = args.find((a) => !a.startsWith('--'));

function resolvePath(input: string): string {
  const p = path.isAbsolute(input) ? input : path.join(process.cwd(), input);
  if (fs.existsSync(p)) return p;
  const alt = path.join(ROOT, 'data', 'import', input);
  if (fs.existsSync(alt)) return alt;
  return p;
}

async function main() {
  if (!fileArg) {
    console.log(`
📄 Importador inteligente CSV → Metamensagem

CSV mínimo:
  frase,autor
  "Texto da frase","Sócrates"

Com tags (opcional):
  quote,author,category

Exemplo:
  npm run frases:import:csv -- "C:\\Users\\user\\Downloads\\quotes.csv\\quotes.csv" --limit 100

Planilhas grandes (~500k linhas): importe em lotes:
  --limit 1000 --offset 0
  --limit 1000 --offset 1000
  ...
  Use --no-ai para volume alto; depois npm run frases:explicacao em lotes.
`);
    process.exit(1);
  }

  const filePath = resolvePath(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  console.log('🚀 Importador CSV inteligente\n');
  console.log(`   Arquivo: ${filePath}`);
  if (limit) console.log(`   Lote: limit=${limit} offset=${offset}`);
  console.log(`   IA: ${noAi ? 'desligada' : hasCuradoriaKeyConfigured() ? getCuradoriaAiProvider() : 'fallback (sem chave)'}\n`);

  const result = await runCsvImportPipeline({
    filePath,
    limit: limit || undefined,
    offset,
    dryRun,
    withAi: !noAi,
    rebuild: !noRebuild,
  });

  console.log('\n📊 Resultado:');
  console.log(`   Linhas lidas:        ${result.read}`);
  console.log(`   Ignoradas no CSV:    ${result.skippedCsv}`);
  console.log(`   Já no acervo:        ${result.duplicateInAcervo}`);
  console.log(`   Transformadas:       ${result.transformed}`);
  console.log(`   Validadas:           ${result.validated}`);
  console.log(`   Rejeitadas:          ${result.rejected}`);
  console.log(`   Gravadas (novas):    ${result.persisted}`);
  console.log(`   Total no acervo:     ${result.masterTotal}`);
  if (dryRun) console.log('\n(dry-run — nada gravado)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
