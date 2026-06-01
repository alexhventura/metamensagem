/**
 * Importação citei em lotes até o fim + rebuild final.
 *
 * Fontes (prioridade):
 *   1. data/citei-api/dumps/quotes.json|ndjson
 *   2. --quotes-file
 *   3. --csv-file (fallback: quote,author,category — ex. Kaggle/Quotable)
 *   4. API (--api-url / CITEI_API_URL)
 *
 * Uso:
 *   npm run frases:import:citei:all
 *   npm run frases:import:citei:all -- --csv-file "C:\...\quotes.csv" --no-ai
 *   npm run frases:import:citei:all -- --start-offset 44012 --batch 800
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { discoverCiteiRepo } from '../lib/importers/citei/discoverDatasets';
import { runCiteiBatch } from '../lib/importers/citei/runCiteiBatch';
import { runCsvImportPipeline } from '../lib/importers/csvImportPipeline';
import { runFinalRebuild } from '../lib/importers/shared/finalRebuild';
import { loadCheckpoint, saveCheckpoint, type BatchCheckpoint } from '../lib/importers/shared/batchState';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_DIR = path.join(ROOT, 'data', 'import', 'logs');
const STATE_PATH = path.join(ROOT, 'data', 'import', 'citei-batch-state.json');

for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
}

const args = process.argv.slice(2);
const noAi = args.includes('--no-ai') || !args.includes('--with-ai');
const resetState = args.includes('--reset-state');

function argValue(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

const batchSize = Math.max(parseInt(argValue('--batch') || '800', 10) || 800, 50);
const startOffsetArg = argValue('--start-offset');
const quotesFileArg = argValue('--quotes-file');
const csvFileArg = argValue('--csv-file');
const apiUrl = argValue('--api-url') || process.env.CITEI_API_URL;

const DEFAULT_CSV = path.join(
  process.env.USERPROFILE || '',
  'Downloads',
  'quotes.csv',
  'quotes.csv'
);

function logLine(logPath: string, msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logPath, line, 'utf8');
  console.log(msg);
}

function resolveQuotesFiles(): string[] {
  if (quotesFileArg) {
    const p = path.isAbsolute(quotesFileArg) ? quotesFileArg : path.join(ROOT, quotesFileArg);
    if (fs.existsSync(p)) return [p];
  }
  const scan = discoverCiteiRepo(path.join(ROOT, 'data', 'citei-api'));
  return scan.quoteFiles;
}

function resolveCsvPath(): string | null {
  const candidates = [
    csvFileArg,
    process.env.CITEI_FALLBACK_CSV,
    DEFAULT_CSV,
    path.join(ROOT, 'data', 'import', 'quotes.csv'),
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    const p = path.isAbsolute(c) ? c : path.join(ROOT, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logPath = path.join(LOG_DIR, `import-citei-all-${Date.now()}.log`);

  const quoteFiles = resolveQuotesFiles();
  const csvPath = quoteFiles.length ? null : resolveCsvPath();

  let source: BatchCheckpoint['source'];
  if (quoteFiles.length) source = 'citei-json';
  else if (csvPath) source = 'csv';
  else if (apiUrl) source = 'citei-api';
  else {
    console.error(`
Nenhuma fonte de frases encontrada.

• Coloque quotes.json em data/citei-api/dumps/
• Ou use: --csv-file "caminho/quotes.csv"
• Ou configure CITEI_API_URL (API citei está offline em 2026)
`);
    process.exit(1);
  }

  let offset = startOffsetArg ? parseInt(startOffsetArg, 10) : 0;
  let totalPersisted = 0;
  let totalRead = 0;
  let batchNum = 0;

  if (!resetState && !startOffsetArg) {
    const saved = loadCheckpoint(STATE_PATH);
    if (saved && saved.source === source) {
      if (source !== 'csv' || saved.filePath === csvPath) {
        offset = saved.offset;
        totalPersisted = saved.totalPersisted;
        totalRead = saved.totalRead;
        batchNum = saved.batchNum;
        logLine(logPath, `↩ Retomando checkpoint offset=${offset}`);
      }
    }
  }

  logLine(logPath, '▶ Importação citei em lotes (até o fim)');
  logLine(logPath, `   Fonte: ${source}`);
  if (quoteFiles.length) logLine(logPath, `   JSON: ${quoteFiles.join(', ')}`);
  if (csvPath) logLine(logPath, `   CSV: ${csvPath}`);
  if (apiUrl) logLine(logPath, `   API: ${apiUrl}`);
  logLine(logPath, `   Lote: ${batchSize} | IA: ${noAi ? 'não' : 'sim'}`);

  let emptyReads = 0;

  while (emptyReads < 3) {
    batchNum++;
    logLine(logPath, `\n── Lote #${batchNum} | offset=${offset}`);

    try {
      let result;
      if (source === 'csv' && csvPath) {
        result = await runCsvImportPipeline({
          filePath: csvPath,
          limit: batchSize,
          offset,
          dryRun: false,
          withAi: !noAi,
          rebuild: false,
          persistBatchSize: 80,
        });
      } else if (source === 'citei-json') {
        result = await runCiteiBatch({
          quoteFiles,
          limit: batchSize,
          offset,
          withAi: !noAi,
        });
      } else {
        result = await runCiteiBatch({
          apiBaseUrl: apiUrl,
          limit: batchSize,
          offset,
          withAi: !noAi,
        });
      }

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

      saveCheckpoint(STATE_PATH, {
        source,
        filePath: csvPath || quoteFiles[0],
        offset,
        totalPersisted,
        totalRead,
        batchNum,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      logLine(logPath, `❌ Erro: ${(e as Error).message}`);
      logLine(logPath, '   Aguardando 30s...');
      await new Promise((r) => setTimeout(r, 30000));
      continue;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  logLine(logPath, '\n🔧 Rebuild final...');
  try {
    runFinalRebuild(ROOT);
  } catch (e) {
    logLine(logPath, `⚠️ Rebuild falhou: ${(e as Error).message}`);
  }

  const done =
    loadCheckpoint(STATE_PATH) ||
    ({
      source: 'csv' as const,
      offset,
      totalPersisted,
      totalRead,
      batchNum,
      updatedAt: new Date().toISOString(),
    } as import('./lib/importers/shared/batchState').BatchCheckpoint);
  done.offset = offset;
  saveCheckpoint(STATE_PATH.replace('.json', '.done.json'), done);
  if (fs.existsSync(STATE_PATH)) fs.unlinkSync(STATE_PATH);

  logLine(logPath, `\n✅ Concluído`);
  logLine(logPath, `   Linhas/frases processadas: ${totalRead}`);
  logLine(logPath, `   Novas gravadas: ${totalPersisted}`);
  logLine(logPath, `   Log: ${logPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
