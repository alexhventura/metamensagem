/**
 * Normalização em massa (sem IA): schema, encoding, explicação fallback, slugs únicos por arquivo.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fixCsvEncoding } from '../lib/importers/csvParser.ts';
import { finalizeFrase } from '../lib/transformers/fraseTransformer.ts';
import { ensureCompleteRecord, validateFrase } from '../lib/validators/fraseValidator.ts';
import { slugify } from '../lib/utils/slugify.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'frases');
const dryRun = process.argv.includes('--dry-run');

function listAuthorFiles() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((n) => n.endsWith('.json') && n !== 'frases.json')
    .map((n) => path.join(CONTENT_DIR, n));
}

function fixEncodingFields(f) {
  return {
    ...f,
    frase_original: fixCsvEncoding(f.frase_original || ''),
    autor_original: fixCsvEncoding(f.autor_original || ''),
    explicacao: fixCsvEncoding(f.explicacao || ''),
    categoria: fixCsvEncoding(f.categoria || 'inspiracional'),
    contextos: (f.contextos || []).map((c) => fixCsvEncoding(String(c))),
    palavras_chave: (f.palavras_chave || []).map((c) => fixCsvEncoding(String(c))),
  };
}

function ensureUniqueSlugs(arr) {
  const used = new Set();
  return arr.map((f) => {
    let slug = f.slug || slugify((f.frase_original || '').slice(0, 80)) || 'frase';
    let candidate = slug;
    let n = 2;
    while (used.has(candidate)) candidate = `${slug}-${n++}`;
    used.add(candidate);
    return candidate === f.slug ? f : { ...f, slug: candidate };
  });
}

function main() {
  const files = listAuthorFiles();
  let total = 0;
  let fixed = 0;
  let invalid = 0;

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(raw)) continue;

    const next = ensureUniqueSlugs(
      raw.map((f) => {
        total++;
        let item = ensureCompleteRecord(fixEncodingFields(f));
        item = finalizeFrase(item);
        const v = validateFrase(item);
        if (!v.valid) invalid++;
        else fixed++;
        return item;
      })
    );

    if (!dryRun) {
      fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`✅ Normalização: ${files.length} arquivos | ${total} frases | inválidas=${invalid}`);
  if (dryRun) console.log('(dry-run)');
}

main();
