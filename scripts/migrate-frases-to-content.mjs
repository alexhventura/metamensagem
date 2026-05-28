/**
 * Migra public/frases.json → content/frases/frases.json (formato CMS completo).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INPUT = path.join(ROOT, 'public', 'frases.json');
const OUTPUT = path.join(ROOT, 'content', 'frases', 'frases.json');

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

function tagToSlug(tag) {
  return slugify(tag);
}

function extractAnoOuData(item) {
  for (const k of ['ano_ou_data', 'a frase foi dita em', 'a_frase_foi_dita_em']) {
    const v = item[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function optStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

const legacy = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const seenSlugs = new Set();
const frases = [];
const today = new Date().toISOString().slice(0, 10);

for (const item of legacy) {
  const frase_original = (item.texto || item.frase_original || '').trim();
  if (!frase_original) continue;

  const autor_original = (item.autor_original || item.autor || 'Anônimo').split('\n')[0].trim();
  const tags = (item.tags || item.palavras_chave || []).map((t) => String(t).trim()).filter(Boolean);
  const categoria = tagToSlug(item.categoria || tags[0] || 'inspiracional');
  const contextos = [...new Set((item.contextos || tags.slice(1)).map(tagToSlug).filter(Boolean))].slice(0, 6);

  let baseSlug = slugify(item.slug || frase_original.slice(0, 60)) || item.id;
  let slug = baseSlug;
  let n = 2;
  while (seenSlugs.has(slug)) {
    slug = `${baseSlug}-${n++}`;
  }
  seenSlugs.add(slug);

  frases.push({
    id: item.id || `f_${slug}`,
    slug,
    frase_original,
    autor_original,
    categoria,
    contextos: contextos.length ? contextos : ['reflexao'],
    ano_ou_data: extractAnoOuData(item),
    explicacao: optStr(item.explicacao) || '',
    fontes: optStr(item.fontes),
    observacao: optStr(item.observacao),
    palavras_chave: tags.map(tagToSlug).slice(0, 8),
    autor_tipo: optStr(item.autor_tipo),
    nacionalidade: optStr(item.nacionalidade),
    nascimento_falecimento: optStr(item.nascimento_falecimento),
    informacoes: item.informacoes || {
      ultima_atualizacao: today,
      confiabilidade: null,
    },
  });
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(frases, null, 2));
console.log(`✅ ${frases.length} frases → ${OUTPUT}`);
