/**
 * Pipeline inteligente CSV → content/frases/{autor}.json
 */

import { execSync } from 'child_process';
import type { FraseCanonical, RawApiQuote } from '../frases/canonical';
import {
  filterNotInAcervo,
  loadExistingSlugsAndTexts,
  persistFrasesIncremental,
} from '../frases/persistByAuthor';
import { loadCuradoriaApiKey } from '../secrets/loadCuradoriaApiKey';
import { curateFrasesInBatches } from '../curation/fraseCurator';
import { validateBatch, ensureCompleteRecord } from '../validators/fraseValidator';
import {
  iterateCsvRows,
  csvRowToRawQuote,
  type CsvParseOptions,
} from './csvParser';
import {
  transformRawQuotesToFrases,
  finalizeFrase,
} from '../transformers/fraseTransformer';

export interface CsvImportOptions extends CsvParseOptions {
  filePath?: string;
  /** Importação sem CSV (ex.: citei-api, APIs manuais). */
  manualRawQuotes?: RawApiQuote[];
  dryRun?: boolean;
  withAi?: boolean;
  rebuild?: boolean;
  /** Frases processadas por lote em disco. */
  persistBatchSize?: number;
  aiBatchSize?: number;
  /** Pausa entre lotes IA (ms). */
  aiDelayMs?: number;
}

export interface CsvImportResult {
  read: number;
  transformed: number;
  validated: number;
  rejected: number;
  persisted: number;
  skippedCsv: number;
  masterTotal: number;
  duplicateInAcervo: number;
}

export async function runCsvImportPipeline(options: CsvImportOptions): Promise<CsvImportResult> {
  const existing = loadExistingSlugsAndTexts();
  /** Slugs do acervo (não mutar durante o lote — só para validateBatch). */
  const acervoSlugs = new Set(existing.slugs);
  /** Slugs reservados ao gerar novos registros (inclui o lote atual). */
  const usedSlugs = new Set(existing.slugs);
  const seenTextKeys = new Set(existing.textKeys);

  let read = 0;
  let transformed = 0;
  let validated = 0;
  let rejected = 0;
  let persisted = 0;
  let skippedCsv = 0;
  let duplicateInAcervo = 0;

  const persistBatchSize = options.persistBatchSize ?? 80;
  const aiKey = options.withAi !== false ? loadCuradoriaApiKey() : undefined;

  let bufferRaw: RawApiQuote[] = [];

  async function flushBuffer() {
    if (!bufferRaw.length) return;

    let frases = transformRawQuotesToFrases(
      bufferRaw.filter((r): r is NonNullable<typeof r> => r !== null),
      usedSlugs
    );
    transformed += frases.length;

    if (aiKey && frases.length) {
      frases = await curateFrasesInBatches(frases, aiKey, options.aiBatchSize ?? 5, options.aiDelayMs ?? 1200);
    } else {
      frases = frases.map(finalizeFrase);
    }

    frases = frases.map(ensureCompleteRecord);
    frases = filterNotInAcervo(frases, { slugs: acervoSlugs, textKeys: seenTextKeys });

    const { valid, rejected: rej } = validateBatch(frases, acervoSlugs);
    rejected += rej.length;
    validated += valid.length;

    for (const f of valid) {
      const key = f.frase_original.toLowerCase().slice(0, 100);
      seenTextKeys.add(key);
      usedSlugs.add(f.slug);
      acervoSlugs.add(f.slug);
    }

    if (!options.dryRun && valid.length) {
      const pr = persistFrasesIncremental(valid, { updateMaster: false });
      persisted += pr.frasesAdded;
    }

    bufferRaw = [];
  }

  async function ingestRaw(raw: RawApiQuote) {
    read++;
    const textKey = raw.quote.toLowerCase().slice(0, 100);
    if (seenTextKeys.has(textKey)) {
      duplicateInAcervo++;
      return;
    }
    bufferRaw.push(raw);
    if (bufferRaw.length >= persistBatchSize) {
      await flushBuffer();
      process.stdout.write(`\r   Processadas ~${read} | gravadas ${persisted}...`);
    }
  }

  if (options.manualRawQuotes?.length) {
    for (const raw of options.manualRawQuotes) {
      if (!raw?.quote?.trim()) continue;
      await ingestRaw(raw);
    }
  } else if (options.filePath) {
    for await (const { row, stats } of iterateCsvRows(options.filePath, {
      delimiter: options.delimiter,
      limit: options.limit,
      offset: options.offset,
    })) {
      skippedCsv = stats.skipped.length;
      const raw = csvRowToRawQuote(row);
      if (!raw) continue;
      await ingestRaw(raw);
    }
  } else {
    throw new Error('Informe filePath ou manualRawQuotes para importar frases.');
  }

  await flushBuffer();
  if (read > 50) process.stdout.write('\n');

  let masterTotal = seenTextKeys.size;
  if (!options.dryRun && persisted > 0 && options.rebuild !== false) {
    const root = process.cwd();
    execSync('node scripts/migrate-all-frases.mjs', { cwd: root, stdio: 'inherit' });
    execSync('node scripts/build-content-metadata.mjs', { cwd: root, stdio: 'inherit' });
    execSync('node prepare-data.cjs', { cwd: root, stdio: 'inherit' });
    const after = loadExistingSlugsAndTexts();
    masterTotal = after.textKeys.size;
  }

  return {
    read,
    transformed,
    validated,
    rejected,
    persisted,
    skippedCsv,
    masterTotal,
    duplicateInAcervo,
  };
}
