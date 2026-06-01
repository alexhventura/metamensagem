/**
 * Extrai frases de dumps JSON/NDJSON ou da API citei.
 */

import fs from 'fs';
import readline from 'readline';
import type { RawApiQuote } from '../../frases/canonical';
import { citeiQuoteToRaw, isCiteiQuoteObject } from './mapCiteiQuote';
import type { CiteiQuoteRaw } from './types';

const DEFAULT_API_BASES = [
  process.env.CITEI_API_URL,
  'https://citei.herokuapp.com/api',
  'http://localhost:3333/api',
].filter(Boolean) as string[];

export interface ExtractCiteiOptions {
  quoteFiles?: string[];
  apiBaseUrl?: string;
  limit?: number;
  offset?: number;
  pageSize?: number;
}

async function* iterateJsonArrayFile(filePath: string): AsyncGenerator<CiteiQuoteRaw> {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (raw.startsWith('[')) {
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (isCiteiQuoteObject(item)) yield item;
      }
    }
    return;
  }
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t) as unknown;
      if (isCiteiQuoteObject(obj)) yield obj;
    } catch {
      /* skip */
    }
  }
}

export async function* extractQuotesFromFiles(
  files: string[],
  options: ExtractCiteiOptions = {}
): AsyncGenerator<RawApiQuote> {
  const limit = options.limit && options.limit > 0 ? options.limit : Infinity;
  const offset = options.offset ?? 0;
  let skipped = 0;
  let yielded = 0;

  for (const file of files) {
    if (yielded >= limit) break;
    for await (const item of iterateJsonArrayFile(file)) {
      if (skipped < offset) {
        skipped++;
        continue;
      }
      if (yielded >= limit) return;
      const mapped = citeiQuoteToRaw(item);
      if (mapped) {
        yielded++;
        yield mapped;
      }
    }
  }
}

export async function fetchQuotesFromCiteiApi(
  options: ExtractCiteiOptions = {}
): Promise<RawApiQuote[]> {
  const bases = options.apiBaseUrl ? [options.apiBaseUrl.replace(/\/$/, '')] : DEFAULT_API_BASES;
  const pageSize = Math.min(options.pageSize ?? 100, 100);
  const maxTotal = options.limit && options.limit > 0 ? options.limit : Infinity;
  const startOffset = options.offset ?? 0;
  const out: RawApiQuote[] = [];

  for (const base of bases) {
    let offset = startOffset;
    try {
      while (out.length < maxTotal) {
        const url = `${base}/quotes?offset=${offset}&count=${pageSize}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) break;
        const batch = (await res.json()) as CiteiQuoteRaw[];
        if (!Array.isArray(batch) || !batch.length) break;
        for (const item of batch) {
          const mapped = citeiQuoteToRaw(item);
          if (mapped) out.push(mapped);
          if (out.length >= maxTotal) break;
        }
        if (batch.length < pageSize) break;
        offset += batch.length;
      }
      if (out.length) return out;
    } catch {
      /* try next base */
    }
  }
  return out;
}

export async function collectCiteiQuotes(options: ExtractCiteiOptions & { quoteFiles?: string[] }): Promise<{
  quotes: RawApiQuote[];
  source: 'files' | 'api' | 'none';
}> {
  const files = options.quoteFiles ?? [];
  if (files.length) {
    const quotes: RawApiQuote[] = [];
    for await (const q of extractQuotesFromFiles(files, options)) quotes.push(q);
    if (quotes.length) return { quotes, source: 'files' };
  }

  const fromApi = await fetchQuotesFromCiteiApi(options);
  if (fromApi.length) return { quotes: fromApi, source: 'api' };

  return { quotes: [], source: 'none' };
}
