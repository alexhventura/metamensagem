/**
 * Gera o campo `explicacao` (único campo criado por IA) para frases do CMS.
 * Usa Gemini quando GEMINI_API_KEY está definida; ou aplica cache em data/frases-explicacao-cache.json.
 *
 * Uso:
 *   node scripts/generate-frases-explicacao.mjs              # gera via API (só vazios)
 *   node scripts/generate-frases-explicacao.mjs --force      # regera todas
 *   node scripts/generate-frases-explicacao.mjs --apply-cache
 *   node scripts/generate-frases-explicacao.mjs --dry-run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'frases');
const CACHE_FILE = path.join(ROOT, 'data', 'frases-explicacao-cache.json');
const MASTER_FILE = path.join(CONTENT_DIR, 'frases.json');

const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const APPLY_CACHE = process.argv.includes('--apply-cache');
const BATCH_SIZE = 8;
const today = new Date().toISOString().slice(0, 10);

for (const envFile of ['.env.local', '.env']) {
  const p = path.join(ROOT, envFile);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  }
}

function listAuthorFiles() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((n) => n.endsWith('.json') && n !== 'frases.json')
    .map((n) => path.join(CONTENT_DIR, n));
}

function loadAllFrases() {
  const byId = new Map();
  for (const file of listAuthorFiles()) {
    const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const f of arr) {
      byId.set(f.id, { ...f, _file: file });
    }
  }
  return byId;
}

function buildPrompt(batch) {
  const items = batch.map((f, i) => ({
    n: i + 1,
    id: f.id,
    frase: f.frase_original,
    autor: f.autor_original,
    categoria: f.categoria,
    contextos: f.contextos,
    autor_tipo: f.autor_tipo,
    nacionalidade: f.nacionalidade,
    periodo: f.nascimento_falecimento,
    ano_ou_data: f.ano_ou_data,
  }));

  return `Você é um especialista em história das ideias e contexto cultural em português do Brasil.

Para cada frase abaixo, escreva uma "explicacao" curta (2 a 4 frases, máximo 420 caracteres) que:
- situe o provável contexto em que a fala/citação faz sentido (obra, época, tema público ou íntimo);
- explique por que alguém diria isso naquele momento ou em que situação o leitor usaria a frase;
- use os metadados fornecidos quando ajudarem, sem inventar datas, obras ou eventos específicos não indicados;
- se a atribuição ao autor for incerta ou a frase for popular/anônima, diga isso com naturalidade;
- tom informativo e acessível, sem tom de marketing;
- responda APENAS em JSON válido: array de objetos { "id": "...", "explicacao": "..." } na mesma ordem dos itens.

Itens:
${JSON.stringify(items, null, 2)}`;
}

function parseModelJson(text) {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('Resposta sem array JSON');
  return JSON.parse(raw.slice(start, end + 1));
}

async function generateBatch(ai, batch) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: buildPrompt(batch),
    config: {
      temperature: 0.55,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Resposta vazia do modelo');
  const parsed = parseModelJson(text);
  if (!Array.isArray(parsed)) throw new Error('JSON não é array');

  const out = {};
  for (const row of parsed) {
    if (!row?.id || !row?.explicacao) continue;
    out[row.id] = String(row.explicacao).trim().slice(0, 500);
  }
  return out;
}

function applyToFiles(byId, cache) {
  const byFile = new Map();
  let updated = 0;

  for (const f of byId.values()) {
    const next = cache[f.id];
    if (!next) continue;
    if (f.explicacao?.trim() && !FORCE && !cache[f.id]) continue;

    const item = { ...f, explicacao: next };
    item.informacoes = {
      ...(f.informacoes || {}),
      ultima_atualizacao: today,
      explicacao_gerada_por_ia: true,
    };
    delete item._file;

    if (!byFile.has(f._file)) byFile.set(f._file, []);
    byFile.get(f._file).push(item);
    updated++;
  }

  for (const file of listAuthorFiles()) {
    const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    const patch = new Map((byFile.get(file) || []).map((x) => [x.id, x]));
    if (!patch.size) continue;

    const merged = arr.map((x) => (patch.has(x.id) ? patch.get(x.id) : x));
    if (!DRY_RUN) fs.writeFileSync(file, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  }

  if (!DRY_RUN) {
    const master = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
    const patchAll = new Map();
    for (const items of byFile.values()) {
      for (const x of items) patchAll.set(x.id, x);
    }
    const mergedMaster = master.map((x) => (patchAll.has(x.id) ? patchAll.get(x.id) : x));
    fs.writeFileSync(MASTER_FILE, JSON.stringify(mergedMaster, null, 2) + '\n', 'utf8');
  }

  return updated;
}

async function main() {
  const byId = loadAllFrases();
  const cache = loadCache();

  const targets = [...byId.values()].filter((f) => FORCE || !f.explicacao?.trim());
  console.log(`📋 ${byId.size} frases no acervo; ${targets.length} alvo(s) para explicacao`);

  if (APPLY_CACHE) {
    const updated = applyToFiles(byId, cache);
    console.log(`✅ Cache aplicado em ${updated} frase(s)`);
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY não definida. Use --apply-cache após gerar data/frases-explicacao-cache.json');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  let generated = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const label = `${i + 1}-${Math.min(i + BATCH_SIZE, targets.length)}/${targets.length}`;
    process.stdout.write(`🤖 Lote ${label}... `);

    try {
      const chunk = await generateBatch(ai, batch);
      Object.assign(cache, chunk);
      saveCache(cache);
      generated += Object.keys(chunk).length;
      console.log(`ok (${Object.keys(chunk).length})`);
    } catch (e) {
      console.log('falhou:', e.message);
    }

    await new Promise((r) => setTimeout(r, 1200));
  }

  const updated = applyToFiles(byId, cache);
  console.log(`\n✅ ${generated} explicações no cache; ${updated} gravadas em content/frases/`);
  if (DRY_RUN) console.log('(dry-run: arquivos não gravados)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
