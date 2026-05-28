/**
 * Gera categorias.json, contextos.json, autores.json a partir de frases.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FRASES = path.join(ROOT, 'content', 'frases', 'frases.json');

const frases = JSON.parse(fs.readFileSync(FRASES, 'utf8'));
const catMap = new Map();
const ctxMap = new Map();
const autMap = new Map();

for (const f of frases) {
  if (f.categoria) {
    catMap.set(f.categoria, (catMap.get(f.categoria) || 0) + 1);
  }
  for (const c of f.contextos || []) {
    ctxMap.set(c, (ctxMap.get(c) || 0) + 1);
  }
  const autor = (f.autor_original || 'anonimo').toLowerCase().trim();
  const autorSlug = autor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  autMap.set(autorSlug, {
    slug: autorSlug,
    nome: f.autor_original,
    count: (autMap.get(autorSlug)?.count || 0) + 1,
  });
}

function labelFromSlug(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const categorias = [...catMap.entries()]
  .map(([slug, count]) => ({
    slug,
    nome: labelFromSlug(slug),
    descricao: `Frases de ${labelFromSlug(slug).toLowerCase()}.`,
    count,
  }))
  .sort((a, b) => b.count - a.count);

const contextos = [...ctxMap.entries()]
  .map(([slug, count]) => ({
    slug,
    nome: labelFromSlug(slug),
    descricao: `Mensagens sobre ${labelFromSlug(slug).toLowerCase()}.`,
    count,
  }))
  .sort((a, b) => b.count - a.count);

const autores = [...autMap.values()].sort((a, b) => b.count - a.count);

for (const dir of ['categorias', 'contextos', 'autores']) {
  fs.mkdirSync(path.join(ROOT, 'content', dir), { recursive: true });
}

fs.writeFileSync(
  path.join(ROOT, 'content', 'categorias', 'categorias.json'),
  JSON.stringify(categorias, null, 2)
);
fs.writeFileSync(
  path.join(ROOT, 'content', 'contextos', 'contextos.json'),
  JSON.stringify(contextos, null, 2)
);
fs.writeFileSync(
  path.join(ROOT, 'content', 'autores', 'autores.json'),
  JSON.stringify(autores, null, 2)
);
console.log(`✅ ${categorias.length} categorias, ${contextos.length} contextos, ${autores.length} autores`);
