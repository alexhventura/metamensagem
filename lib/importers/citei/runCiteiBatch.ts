/**
 * Um lote de importação citei (arquivo ou API) → pipeline canônico.
 */

import { runCsvImportPipeline } from '../csvImportPipeline';
import type { RawApiQuote } from '../../frases/canonical';
import { extractQuotesFromFiles, fetchQuotesFromCiteiApi } from './extractQuotes';

export interface CiteiBatchOptions {
  quoteFiles?: string[];
  apiBaseUrl?: string;
  limit: number;
  offset: number;
  dryRun?: boolean;
  withAi?: boolean;
}

export async function runCiteiBatch(options: CiteiBatchOptions) {
  const quotes: RawApiQuote[] = [];

  if (options.quoteFiles?.length) {
    for await (const q of extractQuotesFromFiles(options.quoteFiles, {
      limit: options.limit,
      offset: options.offset,
    })) {
      quotes.push(q);
    }
  }

  if (!quotes.length && options.apiBaseUrl) {
    const fromApi = await fetchQuotesFromCiteiApi({
      apiBaseUrl: options.apiBaseUrl,
      limit: options.limit,
      offset: options.offset,
      pageSize: 100,
    });
    quotes.push(...fromApi);
  }

  if (!quotes.length) {
    return {
      read: 0,
      persisted: 0,
      validated: 0,
      rejected: 0,
      duplicateInAcervo: 0,
      masterTotal: 0,
      transformed: 0,
      skippedCsv: 0,
    };
  }

  return runCsvImportPipeline({
    manualRawQuotes: quotes,
    dryRun: options.dryRun,
    withAi: options.withAi,
    rebuild: false,
    persistBatchSize: 80,
    aiBatchSize: 5,
    aiDelayMs: 1000,
  });
}
