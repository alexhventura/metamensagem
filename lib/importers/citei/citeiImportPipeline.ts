/**
 * Pipeline citei-api → schema Metamensagem → content/frases/
 */

import { execSync } from 'child_process';
import path from 'path';
import { discoverCiteiRepo, printDiscoveryReport } from './discoverDatasets';
import { collectCiteiQuotes, extractQuotesFromFiles } from './extractQuotes';
import { runCsvImportPipeline } from '../csvImportPipeline';
import type { RawApiQuote } from '../../frases/canonical';

export interface CiteiImportOptions {
  repoPath?: string;
  quotesFile?: string;
  apiBaseUrl?: string;
  limit?: number;
  offset?: number;
  dryRun?: boolean;
  withAi?: boolean;
  rebuild?: boolean;
  discoverOnly?: boolean;
}

export interface CiteiImportResult {
  discovery: string;
  quoteSource: 'files' | 'api' | 'none';
  quotesFound: number;
  import: Awaited<ReturnType<typeof runCsvImportPipeline>> | null;
}

export async function runCiteiImportPipeline(
  options: CiteiImportOptions = {}
): Promise<CiteiImportResult> {
  const repoPath = options.repoPath || path.join(process.cwd(), 'data', 'citei-api');
  const scan = discoverCiteiRepo(repoPath);
  const discovery = printDiscoveryReport(scan);

  if (options.discoverOnly) {
    return { discovery, quoteSource: 'none', quotesFound: 0, import: null };
  }

  const quoteFiles = [...scan.quoteFiles];
  if (options.quotesFile) quoteFiles.push(path.resolve(options.quotesFile));

  let quotes: RawApiQuote[] = [];
  let quoteSource: 'files' | 'api' | 'none' = 'none';

  if (quoteFiles.length) {
    for await (const q of extractQuotesFromFiles(quoteFiles, {
      limit: options.limit,
      offset: options.offset,
    })) {
      quotes.push(q);
    }
    if (quotes.length) quoteSource = 'files';
  }

  if (!quotes.length) {
    const api = await collectCiteiQuotes({
      quoteFiles: [],
      apiBaseUrl: options.apiBaseUrl,
      limit: options.limit,
      offset: options.offset,
    });
    quotes = api.quotes;
    quoteSource = api.source;
  }

  if (!quotes.length) {
    return { discovery, quoteSource: 'none', quotesFound: 0, import: null };
  }

  const importResult = await runCsvImportPipeline({
    manualRawQuotes: quotes,
    dryRun: options.dryRun,
    rebuild: options.rebuild !== false,
    withAi: options.withAi,
  });

  return {
    discovery,
    quoteSource,
    quotesFound: quotes.length,
    import: importResult,
  };
}

export function rebuildSiteData(): void {
  const root = process.cwd();
  execSync('node scripts/build-content-metadata.mjs', { cwd: root, stdio: 'inherit' });
  execSync('node prepare-data.cjs', { cwd: root, stdio: 'inherit' });
}
