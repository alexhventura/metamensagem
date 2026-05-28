/**
 * Lê JSON misto (array ou objeto com arrays) e grava um arquivo por autor em content/frases/.
 * Agrupa por autor_original; deduplica por id; opcionalmente funde em frases.json.
 *
 * Uso:
 *   node scripts/split-frases-by-autor.mjs [caminho-entrada.json]
 *   node scripts/split-frases-by-autor.mjs --merge  (só reagrupa arquivos existentes)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'content', 'frases');
const MASTER_FILE = path.join(OUT_DIR, 'frases.json');

const DEFAULT_INPUT = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Downloads',
  'Frases_diversas.json'
);

/** Inferência só quando categoria ausente (não sobrescreve valor existente). */
const DEFAULT_CATEGORIA_BY_AUTOR_SLUG = {
  'bruce-lee': 'disciplina',
  'albert-einstein': 'ciencia',
  'isaac-newton': 'ciencia',
  'socrates': 'filosofia',
  'sylvester-stallone': 'superacao',
  'raul-seixas': 'filosofia',
};

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 120);
}

function slugifyAutor(nome) {
  return slugify(nome) || 'anonimo';
}

function flattenInput(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const items = [];
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) items.push(...value);
    }
    return items;
  }
  return [];
}

function preserveFrase(item, today) {
  const autor = String(item.autor_original || item.autor || 'Anônimo').trim();
  const autorSlug = slugifyAutor(autor);
  const categoria =
    String(item.categoria || '').trim() ||
    DEFAULT_CATEGORIA_BY_AUTOR_SLUG[autorSlug] ||
    'inspiracional';

  const out = {
    id: String(item.id || '').trim(),
    slug: String(item.slug || '').trim(),
    frase_original: String(item.frase_original || item.texto || '').trim(),
    autor_original: autor,
    categoria,
    contextos: Array.isArray(item.contextos) ? [...item.contextos] : [],
    explicacao: item.explicacao != null ? String(item.explicacao) : '',
    palavras_chave: Array.isArray(item.palavras_chave)
      ? [...item.palavras_chave]
      : Array.isArray(item.tags)
        ? [...item.tags]
        : [],
    autor_tipo: item.autor_tipo != null ? String(item.autor_tipo) : null,
    nacionalidade: item.nacionalidade != null ? String(item.nacionalidade) : null,
    nascimento_falecimento:
      item.nascimento_falecimento != null ? String(item.nascimento_falecimento) : null,
    ano_ou_data: item.ano_ou_data != null ? String(item.ano_ou_data) : null,
  };

  if (item.fontes != null) out.fontes = String(item.fontes);
  if (item.observacao != null) out.observacao = String(item.observacao);
  if (item.informacoes && typeof item.informacoes === 'object') {
    out.informacoes = { ...item.informacoes };
  } else {
    out.informacoes = { ultima_atualizacao: today, confiabilidade: null };
  }

  if (!out.id) {
    out.id = `f_${out.slug || slugify(out.frase_original.slice(0, 40))}`;
  }
  if (!out.slug) {
    out.slug = slugify(out.frase_original.slice(0, 80)) || out.id.replace(/^f_/, '');
  }

  return out;
}

function groupByAutor(items, today) {
  const groups = new Map();

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const frase = preserveFrase(raw, today);
    if (!frase.frase_original) {
      console.warn('⚠️ Item ignorado (sem frase_original):', raw.id || raw);
      continue;
    }

    const autorSlug = slugifyAutor(frase.autor_original);
    if (!groups.has(autorSlug)) groups.set(autorSlug, new Map());
    const byId = groups.get(autorSlug);
    if (byId.has(frase.id)) {
      console.warn(`⚠️ ID duplicado ignorado: ${frase.id} (${frase.autor_original})`);
      continue;
    }
    byId.set(frase.id, frase);
  }

  return groups;
}

function writeAuthorFiles(groups) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const written = [];

  for (const [autorSlug, byId] of groups.entries()) {
    const filePath = path.join(OUT_DIR, `${autorSlug}.json`);
    const list = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2) + '\n', 'utf8');
    written.push({ autorSlug, count: list.length, filePath });
  }

  return written;
}

function mergeAllAuthorFilesIntoMaster() {
  if (!fs.existsSync(OUT_DIR)) return 0;

  const byId = new Map();
  if (fs.existsSync(MASTER_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
      if (Array.isArray(existing)) {
        for (const f of existing) {
          if (f?.id) byId.set(f.id, f);
        }
      }
    } catch {
      console.warn('⚠️ frases.json inválido; será recriado a partir dos arquivos por autor.');
    }
  }

  for (const name of fs.readdirSync(OUT_DIR)) {
    if (!name.endsWith('.json') || name === 'frases.json') continue;
    const full = path.join(OUT_DIR, name);
    const arr = JSON.parse(fs.readFileSync(full, 'utf8'));
    if (!Array.isArray(arr)) continue;
    for (const f of arr) {
      if (!f?.id) continue;
      if (!byId.has(f.id)) byId.set(f.id, f);
    }
  }

  const merged = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(MASTER_FILE, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return merged.length;
}

function loadAuthorFilesOnly() {
  const items = [];
  if (!fs.existsSync(OUT_DIR)) return items;
  for (const name of fs.readdirSync(OUT_DIR)) {
    if (!name.endsWith('.json') || name === 'frases.json') continue;
    const arr = JSON.parse(fs.readFileSync(path.join(OUT_DIR, name), 'utf8'));
    if (Array.isArray(arr)) items.push(...arr);
  }
  return items;
}

async function main() {
  const args = process.argv.slice(2);
  const mergeOnly = args.includes('--merge');
  const inputPath = args.find((a) => !a.startsWith('--')) || DEFAULT_INPUT;

  const today = new Date().toISOString().slice(0, 10);

  if (mergeOnly) {
    const total = mergeAllAuthorFilesIntoMaster();
    console.log(`✅ frases.json — ${total} frases (fundidas de content/frases/*.json)`);
    return;
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Arquivo não encontrado: ${inputPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const items = flattenInput(raw);
  console.log(`📥 ${items.length} itens lidos de ${inputPath}`);

  const groups = groupByAutor(items, today);
  const written = writeAuthorFiles(groups);

  console.log('\n📁 Arquivos por autor:');
  for (const w of written.sort((a, b) => a.autorSlug.localeCompare(b.autorSlug))) {
    console.log(`   ${path.basename(w.filePath)} — ${w.count} frase(s)`);
  }

  const totalMaster = mergeAllAuthorFilesIntoMaster();
  console.log(`\n✅ content/frases/frases.json — ${totalMaster} frases no total (com deduplicação por id)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
