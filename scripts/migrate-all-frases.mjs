/**
 * Migração completa de frases para o padrão canônico do CMS.
 * - Varre content/frases/*.json e public/frases.json (legado)
 * - Normaliza campos (ano_ou_data, slugs, etc.)
 * - Propaga metadados entre frases do mesmo autor (dados já existentes)
 * - Enriquece com data/frases-author-facts.json apenas em campos vazios
 * - Não inventa frase_original nem datas sem base; explicacao vem do script generate-frases-explicacao
 * - Regrava arquivos por autor + frases.json
 *
 * Uso: node scripts/migrate-all-frases.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'frases');
const LEGACY_PUBLIC = path.join(ROOT, 'public', 'frases.json');
const AUTHOR_FACTS_FILE = path.join(ROOT, 'data', 'frases-author-facts.json');
const MASTER_FILE = path.join(CONTENT_DIR, 'frases.json');

const DRY_RUN = process.argv.includes('--dry-run');
const today = new Date().toISOString().slice(0, 10);

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

function normAutorKey(nome) {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function uniqueStrings(arr) {
  return [...new Set(arr.map((s) => String(s).trim()).filter(Boolean))];
}

function optStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function extractAnoOuData(raw) {
  for (const k of ['ano_ou_data', 'a frase foi dita em', 'a_frase_foi_dita_em']) {
    const v = raw[k];
    const s = optStr(v);
    if (s) return s;
  }
  return null;
}

function sanitizeTexto(s) {
  return String(s || '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Formato canônico obrigatório (+ informacoes para o pipeline existente). */
function toCanonical(raw, usedSlugs) {
  const frase_original = sanitizeTexto(raw.frase_original ?? raw.texto ?? raw.quote);
  if (!frase_original) return null;

  const autor_original = sanitizeTexto(
    (raw.autor_original ?? raw.autor ?? 'Anônimo').split('\n')[0]
  );
  if (!autor_original || autor_original.toLowerCase() === 'anonimo') {
    /* mantém Anônimo explícito */
  }

  const palavras_chave = uniqueStrings(
    (raw.palavras_chave ?? raw.tags ?? []).map((t) => slugify(String(t)))
  );
  const categoria = slugify(raw.categoria || palavras_chave[0] || 'inspiracional');
  const contextos = uniqueStrings(
    (raw.contextos ?? palavras_chave.slice(1)).map((c) => slugify(String(c)))
  );
  const ctxFinal = contextos.length ? contextos : ['reflexao'];

  let slug = slugify(raw.slug || frase_original.slice(0, 80));
  if (!slug) slug = slugify(raw.id || 'frase');
  let candidate = slug;
  let n = 2;
  while (usedSlugs.has(candidate)) candidate = `${slug}-${n++}`;
  usedSlugs.add(candidate);
  slug = candidate;

  const id = optStr(raw.id) || `f_${slug}`;

  const explicacao = sanitizeTexto(raw.explicacao) || '';

  const base = {
    id,
    slug,
    frase_original,
    autor_original,
    categoria,
    contextos: ctxFinal,
    explicacao,
    palavras_chave: palavras_chave.length ? palavras_chave : uniqueStrings([categoria, ...ctxFinal]).slice(0, 8),
    autor_tipo: optStr(raw.autor_tipo),
    nacionalidade: optStr(raw.nacionalidade),
    nascimento_falecimento: optStr(raw.nascimento_falecimento),
    ano_ou_data: extractAnoOuData(raw),
  };

  const fontes = optStr(raw.fontes);
  const observacao = optStr(raw.observacao);
  if (fontes) base.fontes = fontes;
  if (observacao) base.observacao = observacao;

  base.informacoes = {
    ultima_atualizacao:
      optStr(raw.informacoes?.ultima_atualizacao) || today,
    confiabilidade: optStr(raw.informacoes?.confiabilidade),
  };

  return base;
}

function loadAllRawFrases() {
  const byId = new Map();

  function mergePreferFilled(a, b) {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) {
      if (v == null || v === '') continue;
      if (out[k] == null || out[k] === '') out[k] = v;
      else if (typeof v === 'object' && !Array.isArray(v) && k === 'informacoes') {
        out.informacoes = { ...out.informacoes, ...v };
      }
    }
    return out;
  }

  function ingest(items, source) {
    const list = Array.isArray(items) ? items : flattenObject(items);
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const texto = sanitizeTexto(item.frase_original ?? item.texto);
      const id =
        optStr(item.id) ||
        `f_${slugify(`${texto}|${item.autor_original ?? item.autor}`)}`;
      if (byId.has(id)) {
        byId.set(id, mergePreferFilled(byId.get(id), item));
      } else {
        byId.set(id, { ...item });
      }
    }
  }

  function flattenObject(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const out = [];
      for (const v of Object.values(data)) {
        if (Array.isArray(v)) out.push(...v);
      }
      return out;
    }
    return [];
  }

  if (fs.existsSync(CONTENT_DIR)) {
    for (const name of fs.readdirSync(CONTENT_DIR)) {
      if (!name.endsWith('.json')) continue;
      const full = path.join(CONTENT_DIR, name);
      try {
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        ingest(data, name);
      } catch (e) {
        console.error(`❌ JSON inválido: ${name}`, e.message);
      }
    }
  }

  if (fs.existsSync(LEGACY_PUBLIC)) {
    try {
      ingest(JSON.parse(fs.readFileSync(LEGACY_PUBLIC, 'utf8')), 'public/frases.json');
    } catch (e) {
      console.warn('⚠️ public/frases.json ignorado:', e.message);
    }
  }

  return [...byId.values()];
}

function loadAuthorFacts() {
  const facts = {};
  if (!fs.existsSync(AUTHOR_FACTS_FILE)) return facts;
  const raw = JSON.parse(fs.readFileSync(AUTHOR_FACTS_FILE, 'utf8'));
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('_')) continue;
    facts[normAutorKey(key)] = value;
  }

  for (const name of fs.readdirSync(CONTENT_DIR)) {
    if (!name.endsWith('.json') || name === 'frases.json') continue;
    const arr = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, name), 'utf8'));
    if (!Array.isArray(arr) || !arr[0]) continue;
    const key = normAutorKey(arr[0].autor_original);
    const sample = arr.find((f) => f.autor_tipo && f.nacionalidade);
    if (sample && !facts[key]) {
      facts[key] = {
        autor_tipo: sample.autor_tipo,
        nacionalidade: sample.nacionalidade,
        nascimento_falecimento: sample.nascimento_falecimento,
      };
    }
  }
  return facts;
}

function propagateAuthorMetadata(frases) {
  const byAuthor = new Map();
  for (const f of frases) {
    const key = normAutorKey(f.autor_original);
    if (!byAuthor.has(key)) {
      byAuthor.set(key, {
        autor_tipo: null,
        nacionalidade: null,
        nascimento_falecimento: null,
      });
    }
    const agg = byAuthor.get(key);
    for (const field of ['autor_tipo', 'nacionalidade', 'nascimento_falecimento']) {
      if (!agg[field] && f[field]) agg[field] = f[field];
    }
  }
  return byAuthor;
}

function enrichFrases(frases, authorAgg, authorFacts) {
  let enriched = 0;
  for (const f of frases) {
    const key = normAutorKey(f.autor_original);
    const agg = authorAgg.get(key) || {};
    const facts = authorFacts[key] || {};

    for (const field of ['autor_tipo', 'nacionalidade', 'nascimento_falecimento']) {
      if (f[field]) continue;
      const fromAgg = agg[field];
      const fromFacts = facts[field];
      const next = fromAgg || fromFacts;
      if (next) {
        f[field] = next;
        enriched++;
      }
    }
  }
  return enriched;
}

function writeOutputs(frases) {
  const byAuthor = new Map();
  for (const f of frases) {
    const slug = slugifyAutor(f.autor_original);
    if (!byAuthor.has(slug)) byAuthor.set(slug, []);
    byAuthor.get(slug).push(f);
  }

  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const sortedMaster = [...frases].sort((a, b) => a.id.localeCompare(b.id));
  if (!DRY_RUN) {
    fs.writeFileSync(MASTER_FILE, JSON.stringify(sortedMaster, null, 2) + '\n', 'utf8');
  }

  const files = [];
  for (const [autorSlug, list] of [...byAuthor.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const filePath = path.join(CONTENT_DIR, `${autorSlug}.json`);
    const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
    }
    files.push({ autorSlug, count: sorted.length });
  }

  return { total: sortedMaster.length, files };
}

function validateFrases(frases) {
  const errors = [];
  const ids = new Set();
  for (const f of frases) {
    if (!f.id) errors.push('frase sem id');
    if (ids.has(f.id)) errors.push(`id duplicado: ${f.id}`);
    ids.add(f.id);
    if (!f.frase_original) errors.push(`sem frase_original: ${f.id}`);
    if (!f.slug) errors.push(`sem slug: ${f.id}`);
    if (!Array.isArray(f.contextos)) errors.push(`contextos inválido: ${f.id}`);
    try {
      JSON.stringify(f);
    } catch {
      errors.push(`JSON não serializável: ${f.id}`);
    }
  }
  return errors;
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — migrate-all-frases' : '🚀 Migração completa de frases');

  const rawList = loadAllRawFrases();
  console.log(`📥 ${rawList.length} registros brutos carregados`);

  const usedSlugs = new Set();
  const frases = [];
  let skipped = 0;

  for (const raw of rawList) {
    const normalized = toCanonical(raw, usedSlugs);
    if (normalized) frases.push(normalized);
    else skipped++;
  }

  const authorAgg = propagateAuthorMetadata(frases);
  const authorFacts = loadAuthorFacts();
  const enrichCount = enrichFrases(frases, authorAgg, authorFacts);

  const errors = validateFrases(frases);
  if (errors.length) {
    console.error('❌ Erros de validação:', errors.slice(0, 20));
    process.exit(1);
  }

  const { total, files } = writeOutputs(frases);

  const withBio = frases.filter((f) => f.autor_tipo && f.nacionalidade).length;
  const withExplicacao = frases.filter((f) => f.explicacao?.trim()).length;
  const withAno = frases.filter((f) => f.ano_ou_data).length;

  console.log(`\n✅ ${total} frases normalizadas (${skipped} ignoradas)`);
  console.log(`   ${files.length} arquivos por autor em content/frases/`);
  console.log(`   ${withBio} com autor_tipo + nacionalidade`);
  console.log(`   ${withExplicacao} com explicacao preenchida`);
  console.log(`   ${withAno} com ano_ou_data`);
  console.log(`   ${enrichCount} campos biográficos preenchidos (vazios → dado verificável)`);
  if (DRY_RUN) console.log('\n(dry-run: nenhum arquivo gravado)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
