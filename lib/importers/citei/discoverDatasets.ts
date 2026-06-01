/**
 * Analisa o repositório citei-api e localiza datasets relevantes.
 */

import fs from 'fs';
import path from 'path';
import type { CiteiDatasetScan, CiteiQuoteRaw } from './types';

const QUOTE_FILE_NAMES = [
  'quotes.json',
  'quotes.ndjson',
  'quotes.jsonl',
  'citei-quotes.json',
  'frases.json',
];

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'tests',
  'test',
  '__tests__',
]);

function isQuoteLike(obj: unknown): obj is CiteiQuoteRaw {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  const text = typeof o.text === 'string' ? o.text.trim() : '';
  const author = typeof o.author === 'string' ? o.author.trim() : '';
  return text.length >= 15 && author.length >= 1;
}

function fileLooksLikeQuoteDump(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  if (QUOTE_FILE_NAMES.includes(base)) return true;
  if (base.includes('quote') && (base.endsWith('.json') || base.endsWith('.ndjson') || base.endsWith('.jsonl')))
    return true;

  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 200_000_000) return true;
    const head = fs.readFileSync(filePath, 'utf8').slice(0, 8000);
    if (head.includes('"text"') && head.includes('"author"')) return true;
    const start = head.indexOf('[');
    if (start >= 0) {
      const snippet = head.slice(start, start + 4000);
      const parsed = JSON.parse(snippet + ']}') as unknown;
      if (Array.isArray(parsed) && parsed.some(isQuoteLike)) return true;
    }
  } catch {
    /* not a json array header */
  }
  return false;
}

function walkForQuoteFiles(dir: string, out: string[], depth = 0): void {
  if (depth > 6 || !fs.existsSync(dir)) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (IGNORE_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkForQuoteFiles(full, out, depth + 1);
    } else if (ent.isFile() && /\.(json|ndjson|jsonl)$/i.test(ent.name)) {
      const base = ent.name.toLowerCase();
      if (base === 'authors.json' || base === 'categories.json') continue;
      if (fileLooksLikeQuoteDump(full)) out.push(full);
    }
  }
}

export function discoverCiteiRepo(repoPath: string): CiteiDatasetScan {
  const resolved = path.resolve(repoPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Repositório não encontrado: ${resolved}`);
  }

  const authorsFile = path.join(resolved, 'src', 'utils', 'authors.json');
  const categoriesFile = path.join(resolved, 'src', 'utils', 'categories.json');
  const dumpsDir = path.join(resolved, 'dumps');

  const quoteFiles: string[] = [];
  if (fs.existsSync(dumpsDir)) walkForQuoteFiles(dumpsDir, quoteFiles);
  walkForQuoteFiles(resolved, quoteFiles);

  const uniqueQuotes = [...new Set(quoteFiles.map((f) => path.resolve(f)))];

  let authorsCount = 0;
  let categoriesCount = 0;
  if (fs.existsSync(authorsFile)) {
    authorsCount = (JSON.parse(fs.readFileSync(authorsFile, 'utf8')) as unknown[]).length;
  }
  if (fs.existsSync(categoriesFile)) {
    categoriesCount = (JSON.parse(fs.readFileSync(categoriesFile, 'utf8')) as unknown[]).length;
  }

  return {
    repoPath: resolved,
    authorsFile: fs.existsSync(authorsFile) ? authorsFile : undefined,
    categoriesFile: fs.existsSync(categoriesFile) ? categoriesFile : undefined,
    quoteFiles: uniqueQuotes,
    authorsCount,
    categoriesCount,
  };
}

export function printDiscoveryReport(scan: CiteiDatasetScan): string {
  const lines = [
    `Repositório: ${scan.repoPath}`,
    `Autores (metadata): ${scan.authorsCount}`,
    `Categorias (metadata): ${scan.categoriesCount}`,
    `Arquivos de frases encontrados: ${scan.quoteFiles.length}`,
  ];
  if (scan.quoteFiles.length) {
    lines.push('Arquivos:');
    for (const f of scan.quoteFiles.slice(0, 10)) lines.push(`  - ${f}`);
    if (scan.quoteFiles.length > 10) lines.push(`  ... +${scan.quoteFiles.length - 10}`);
  } else {
    lines.push(
      '',
      'Nenhum dump de frases no repositório (normal: citei-api guarda frases no MongoDB).',
      'Coloque quotes.json ou quotes.ndjson em data/citei-api/dumps/',
      'ou defina CITEI_API_URL / --api-url para buscar pela API.'
    );
  }
  return lines.join('\n');
}
