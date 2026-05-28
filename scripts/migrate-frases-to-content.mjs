/**
 * Migra public/frases.json → content/frases/frases.json (formato CMS).
 * Uso: node scripts/migrate-frases-to-content.mjs
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

const legacy = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const seenSlugs = new Set();
const frases = [];

for (const item of legacy) {
  const frase_original = (item.texto || '').trim();
  if (!frase_original) continue;

  const autor_original = (item.autor || 'Anônimo').split('\n')[0].trim();
  const tags = (item.tags || []).map((t) => String(t).trim()).filter(Boolean);
  const categoria = tagToSlug(tags[0] || 'inspiracional');
  const contextos = [...new Set(tags.slice(1).map(tagToSlug).filter(Boolean))].slice(0, 6);

  let baseSlug = slugify(frase_original.slice(0, 60)) || item.id;
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
    explicacao: '',
    palavras_chave: tags.map(tagToSlug).slice(0, 8),
  });
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(frases, null, 2));
console.log(`✅ ${frases.length} frases → ${OUTPUT}`);
