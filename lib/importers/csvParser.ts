/**
 * Parser CSV inteligente — UTF-8, delimitador automático, frase + autor (+ tags opcionais).
 */

import fs from 'fs';
import readline from 'readline';
import type { RawApiQuote } from '../frases/canonical';

export type CsvDelimiter = 'auto' | ',' | ';' | '\t';

export interface CsvParseOptions {
  delimiter?: CsvDelimiter;
  limit?: number;
  /** Pula N linhas de dados após o cabeçalho. */
  offset?: number;
}

export interface CsvRowInput {
  quote: string;
  author: string;
  tags: string[];
  lineNumber: number;
}

export interface CsvParseStats {
  delimiter: string;
  headers: string[];
  parsed: number;
  skipped: { line: number; reason: string }[];
}

const QUOTE_ALIASES = ['frase', 'texto', 'quote', 'citacao', 'citação', 'frase_original', 'mensagem'];
const AUTHOR_ALIASES = ['autor', 'author', 'autor_original', 'nome_autor'];
const TAG_ALIASES = ['tags', 'categoria', 'category', 'contexto', 'contextos', 'tema'];

export function fixCsvEncoding(text: string): string {
  if (!text) return text;
  if (/Ã.|â.|Ă./.test(text)) {
    try {
      const fixed = Buffer.from(text, 'latin1').toString('utf8');
      if (fixed && !fixed.includes('\uFFFD')) return fixed;
    } catch {
      /* keep */
    }
  }
  return text
    .replace(/â€™|â\x9d\x99/g, "'")
    .replace(/â€œ|â\x9c/g, '"')
    .replace(/â€|â\x80\x94/g, '—')
    .replace(/\uFFFD/g, '');
}

export function normalizeAuthorName(raw: string): string {
  let s = fixCsvEncoding(raw.trim());
  if (!s) return 'Anônimo';
  const comma = s.indexOf(',');
  if (comma > 2 && comma < 72) {
    const first = s.slice(0, comma).trim();
    if (first.length >= 2 && !/^\d{4}$/.test(first)) s = first;
  }
  return s.replace(/\s+/g, ' ').trim() || 'Anônimo';
}

function normHeader(h: string): string {
  return fixCsvEncoding(h)
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function detectDelimiter(line: string): string {
  const semi = (line.match(/;/g) || []).length;
  const comma = (line.match(/,/g) || []).length;
  const tab = (line.match(/\t/g) || []).length;
  if (tab >= semi && tab >= comma && tab > 0) return '\t';
  if (semi > comma) return ';';
  return ',';
}

export function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => fixCsvEncoding(c.trim()));
}

function mapHeaders(headers: string[]): { quote: number; author: number; tags?: number } {
  const norm = headers.map(normHeader);
  const idx: { quote?: number; author?: number; tags?: number } = {};
  for (let i = 0; i < norm.length; i++) {
    if (QUOTE_ALIASES.includes(norm[i])) idx.quote = i;
    if (AUTHOR_ALIASES.includes(norm[i])) idx.author = i;
    if (TAG_ALIASES.includes(norm[i])) idx.tags = i;
  }
  if (idx.quote === undefined) throw new Error(`Coluna "frase/quote" não encontrada. Cabeçalhos: ${headers.join(', ')}`);
  if (idx.author === undefined) throw new Error(`Coluna "autor/author" não encontrada. Cabeçalhos: ${headers.join(', ')}`);
  return idx as { quote: number; author: number; tags?: number };
}

function splitTags(raw: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;|]/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t && t.length < 40);
}

export function csvRowToRawQuote(row: CsvRowInput): RawApiQuote | null {
  const quote = fixCsvEncoding(row.quote.trim());
  const author = normalizeAuthorName(row.author);
  if (!quote || quote.length < 15) return null;
  return {
    quote,
    author,
    tags: row.tags,
    apiTags: [],
    source: 'csv-import',
    sourceUrl: null,
  };
}

/** Itera linhas do CSV sem carregar o arquivo inteiro na memória. */
export async function* iterateCsvRows(
  filePath: string,
  options: CsvParseOptions = {}
): AsyncGenerator<{ row: CsvRowInput; stats: CsvParseStats }> {
  const skipped: { line: number; reason: string }[] = [];
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let delimiter = ',';
  let headers: string[] = [];
  let col: { quote: number; author: number; tags?: number } | null = null;
  let lineNo = 0;
  let dataIndex = 0;
  let yielded = 0;
  const offset = options.offset ?? 0;
  const limit = options.limit && options.limit > 0 ? options.limit : Infinity;

  for await (const rawLine of rl) {
    lineNo++;
    const line = rawLine.replace(/^\uFEFF/, '');
    if (!line.trim()) continue;

    if (!col) {
      delimiter =
        options.delimiter && options.delimiter !== 'auto' ? options.delimiter : detectDelimiter(line);
      headers = parseCsvLine(line, delimiter);
      col = mapHeaders(headers);
      continue;
    }

    if (dataIndex < offset) {
      dataIndex++;
      continue;
    }
    if (yielded >= limit) break;

    const cells = parseCsvLine(line, delimiter);
    const quote = cells[col.quote] || '';
    const author = cells[col.author] || '';
    const tagsRaw = col.tags !== undefined ? cells[col.tags] || '' : '';

    if (!quote.trim()) {
      skipped.push({ line: lineNo, reason: 'Frase vazia' });
      dataIndex++;
      continue;
    }
    if (quote.trim().length < 15) {
      skipped.push({ line: lineNo, reason: 'Frase muito curta' });
      dataIndex++;
      continue;
    }

    dataIndex++;
    yielded++;
    yield {
      row: { quote, author, tags: splitTags(tagsRaw), lineNumber: lineNo },
      stats: { delimiter, headers, parsed: yielded, skipped: [...skipped] },
    };
  }
}

/** Carrega até `limit` linhas em memória (útil para dry-run e testes). */
export async function parseCsvFile(filePath: string, options: CsvParseOptions = {}): Promise<{
  rows: CsvRowInput[];
  stats: CsvParseStats;
}> {
  const rows: CsvRowInput[] = [];
  let stats: CsvParseStats = { delimiter: ',', headers: [], parsed: 0, skipped: [] };
  for await (const { row, stats: s } of iterateCsvRows(filePath, options)) {
    rows.push(row);
    stats = s;
  }
  return { rows, stats };
}
