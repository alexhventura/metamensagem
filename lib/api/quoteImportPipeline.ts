/**
 * Orquestrador: API → transform → validate → persist.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fetchQuotesFromApis, type FetchQuotesOptions } from './quoteFetch';
import { transformQuotes, rawFromLegacyInput } from '../transformers/quoteTransformer';
import { validateBatch, ensureCompleteRecord } from '../validators/quoteValidator';
import {
  filterNotInAcervo,
  loadExistingSlugsAndTexts,
  persistFrasesByAuthor,
} from '../frases/persistByAuthor';
import type { FraseCanonical } from '../frases/canonical';
import { loadCuradoriaApiKey } from '../secrets/loadCuradoriaApiKey';

export interface ImportPipelineOptions extends FetchQuotesOptions {
  aiApiKey?: string;
  /** @deprecated use aiApiKey */
  geminiApiKey?: string;
  rebuild?: boolean;
  dryRun?: boolean;
  /** Não busca APIs externas (ex.: import só de CSV). */
  skipApiFetch?: boolean;
  manualQuotes?: { quote: string; author: string; tags?: string[]; sourceUrl?: string | null }[];
}

export interface ImportPipelineResult {
  fetched: number;
  transformed: number;
  validated: number;
  rejected: number;
  persisted: number;
  masterTotal: number;
  rebuild: boolean;
}

export async function runQuoteImportPipeline(
  options: ImportPipelineOptions = {}
): Promise<ImportPipelineResult> {
  const existing = loadExistingSlugsAndTexts();

  let rawList: Awaited<ReturnType<typeof fetchQuotesFromApis>> = [];
  if (!options.skipApiFetch) {
    rawList = await fetchQuotesFromApis({
      sources: options.sources,
      limitPerSource: options.limitPerSource,
      maxTotal: options.maxTotal,
    });
  }

  if (options.manualQuotes?.length) {
    for (const m of options.manualQuotes) {
      const r = rawFromLegacyInput({
        quote: m.quote,
        author: m.author,
        tags: m.tags,
        source: 'csv-import',
        sourceUrl: m.sourceUrl ?? undefined,
      });
      if (r) rawList.push(r);
    }
  }

  rawList = rawList.filter((r) => {
    const key = r.quote.toLowerCase().slice(0, 100);
    return key && !existing.textKeys.has(key);
  });

  const aiKey =
    options.aiApiKey === ''
      ? undefined
      : options.aiApiKey || options.geminiApiKey || loadCuradoriaApiKey();
  let transformed = await transformQuotes(rawList, { aiApiKey: aiKey });

  transformed = transformed.map(ensureCompleteRecord);
  transformed = filterNotInAcervo(transformed, existing);

  const { valid, rejected } = validateBatch(transformed, existing.slugs);

  let persisted = 0;
  let masterTotal = existing.textKeys.size;

  if (!options.dryRun && valid.length) {
    const result = persistFrasesByAuthor(valid);
    persisted = result.frasesAdded;
    masterTotal = result.masterTotal;

    if (options.rebuild !== false) {
      const root = process.cwd();
      execSync('node scripts/migrate-all-frases.mjs', { cwd: root, stdio: 'inherit' });
      execSync('node scripts/build-content-metadata.mjs', { cwd: root, stdio: 'inherit' });
      execSync('node prepare-data.cjs', { cwd: root, stdio: 'inherit' });
    }
  }

  return {
    fetched: rawList.length,
    transformed: transformed.length,
    validated: valid.length,
    rejected: rejected.length,
    persisted,
    masterTotal,
    rebuild: Boolean(!options.dryRun && valid.length && options.rebuild !== false),
  };
}

export async function importSingleQuote(quote: string, author: string): Promise<FraseCanonical | null> {
  const raw = rawFromLegacyInput({ quote, author, source: 'api-import' });
  if (!raw) return null;
  const existing = loadExistingSlugsAndTexts();
  const [transformed] = await transformQuotes([raw], { aiApiKey: loadCuradoriaApiKey() });
  const complete = ensureCompleteRecord(transformed);
  const { valid } = validateBatch([complete], existing.slugs);
  if (!valid.length) return null;
  persistFrasesByAuthor(valid);
  return valid[0];
}
