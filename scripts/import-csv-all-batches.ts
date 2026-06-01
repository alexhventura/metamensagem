/**
 * Importa CSV grande em lotes até o fim do arquivo.
 *
 * Uso:
 *   npx tsx scripts/import-csv-all-batches.ts "c:\caminho\quotes.csv"
 *   npx tsx scripts/import-csv-all-batches.ts arquivo.csv --batch 800 --no-ai
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runCsvImportPipeline } from '../lib/importers/csvImportPipeline';
import { runFinalRebuild } from '../lib/importers/shared/finalRebuild';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_DIR = path.join(ROOT, 'data', 'import', 'logs');

for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
}

const args = process.argv.slice(2);
const noAi = args.includes('--no-ai') || !args.includes('--with-ai');
const batchIdx = args.indexOf('--batch');
const batchSize = batchIdx >= 0 ? Math.max(parseInt(args[batchIdx + 1], 10) || 800, 50) : 800;
const startIdx = args.indexOf('--start-offset');
const startOffset = startIdx >= 0 ? Math.max(parseInt(args[startIdx + 1], 10) || 0, 0) : 0;
const fileArg = args.find((a) => !a.startsWith('--') && !a.match(/^\d+$/));

function resolvePath(input: string): string {
  const p = path.isAbsolute(input) ? input : path.join(process.cwd(), input);
  if (fs.existsSync(p)) return p;
  return path.join(ROOT, 'data', 'import', input);
}

function logLine(logPath: string, msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logPath, line, 'utf8');
  console.log(msg);
}

async function main() {
  if (!fileArg) {
    console.error('Uso: npx tsx scripts/import-csv-all-batches.ts <arquivo.csv> [--batch 800] [--no-ai]');
    process.exit(1);
  }

  const filePath = resolvePath(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logPath = path.join(LOG_DIR, `import-${path.basename(filePath, '.csv')}-${Date.now()}.log`);

  logLine(logPath, `▶ Início importação em lotes`);
  logLine(logPath, `   Arquivo: ${filePath}`);
  logLine(logPath, `   Lote: ${batchSize} | IA: ${noAi ? 'não' : 'sim'}`);

  let offset = startOffset;
  let totalPersisted = 0;
  let totalRead = 0;
  let batchNum = 0;
  let emptyReads = 0;

  while (emptyReads < 2) {
    batchNum++;
    logLine(logPath, `\n── Lote #${batchNum} | offset=${offset}`);

    try {
      const result = await runCsvImportPipeline({
        filePath,
        limit: batchSize,
        offset,
        dryRun: false,
        withAi: !noAi,
        rebuild: false,
        persistBatchSize: 80,
        aiBatchSize: 5,
        aiDelayMs: 1000,
      });

      totalRead += result.read;
      totalPersisted += result.persisted;

      logLine(
        logPath,
        `   lidas=${result.read} gravadas=${result.persisted} validadas=${result.validated} ` +
          `dup=${result.duplicateInAcervo} rej=${result.rejected} acervo≈${result.masterTotal}`
      );

      if (result.read === 0) {
        emptyReads++;
      } else {
        emptyReads = 0;
        offset += result.read;
      }

      if (result.read > 0 && result.persisted === 0 && result.duplicateInAcervo >= result.read) {
        offset += result.read;
      }
    } catch (e) {
      logLine(logPath, `❌ Erro no lote: ${(e as Error).message}`);
      logLine(logPath, '   Aguardando 30s e tentando de novo...');
      await new Promise((r) => setTimeout(r, 30000));
      continue;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  logLine(logPath, '\n🔧 Rebuild final (metadata + prepare-data)...');
  try {
    runFinalRebuild(ROOT);
  } catch (e) {
    logLine(logPath, `⚠️ Rebuild falhou: ${(e as Error).message}`);
  }

  logLine(logPath, `\n✅ Concluído`);
  logLine(logPath, `   Linhas processadas: ${totalRead}`);
  logLine(logPath, `   Frases novas gravadas: ${totalPersisted}`);
  logLine(logPath, `   Log: ${logPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
