/**
 * Curadoria: frase + autor (API ou manual) → registro canônico do CMS Metamensagem.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
const AUTHOR_FACTS_FILE = path.join(ROOT, 'data', 'frases-author-facts.json');
const CONTENT_MASTER = path.join(ROOT, 'content', 'frases', 'frases.json');

const TAG_TO_SLUG = {
  sabedoria: 'sabedoria',
  reflexao: 'reflexao',
  reflexão: 'reflexao',
  inspiracional: 'inspiracional',
  motivacao: 'motivacao',
  motivação: 'motivacao',
  sucesso: 'sucesso',
  felicidade: 'felicidade',
  otimismo: 'otimismo',
  amor: 'amor',
  fe: 'fe',
  fé: 'fe',
  coragem: 'coragem',
  superacao: 'superacao',
  superação: 'superacao',
  filosofia: 'reflexao',
  vida: 'reflexao',
  aprendizado: 'aprendizado',
  foco: 'foco',
  estrategia: 'estrategia',
  ciencia: 'ciencia',
  ciência: 'ciencia',
  determinacao: 'determinacao',
  sonhos: 'sonhos',
  mudanca: 'mudanca',
};

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 120);
}

export function normAutorKey(nome) {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function sanitizeTexto(s) {
  return String(s || '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(arr) {
  return [...new Set(arr.map((s) => String(s).trim()).filter(Boolean))];
}

function tagToSlug(tag) {
  const k = slugify(tag);
  return TAG_TO_SLUG[k] || k;
}

export function mapTagsToContextos(tags = []) {
  const out = new Set(['inspiracional']);
  for (const t of tags) {
    const s = tagToSlug(t);
    if (s) out.add(s);
  }
  return [...out].slice(0, 6);
}

export function hashId(prefix, text, autor) {
  const h = crypto.createHash('sha1').update(`${text}|${autor}`).digest('hex').slice(0, 10);
  return `${prefix}_${h}`;
}

export function loadAuthorFacts() {
  const facts = {};
  if (!fs.existsSync(AUTHOR_FACTS_FILE)) return facts;
  const raw = JSON.parse(fs.readFileSync(AUTHOR_FACTS_FILE, 'utf8'));
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('_')) continue;
    facts[normAutorKey(key)] = value;
  }
  return facts;
}

export function loadExistingTextKeys() {
  const keys = new Set();
  if (!fs.existsSync(CONTENT_MASTER)) return keys;
  try {
    const arr = JSON.parse(fs.readFileSync(CONTENT_MASTER, 'utf8'));
    for (const f of arr) {
      const t = sanitizeTexto(f.frase_original).toLowerCase().slice(0, 100);
      if (t) keys.add(t);
    }
  } catch {
    /* ignore */
  }
  return keys;
}

/** Entrada mínima vinda de API ou CLI. */
export function normalizeRawInput(input) {
  const frase_original = sanitizeTexto(
    input.frase_original ?? input.texto ?? input.content ?? input.quote ?? input.q
  );
  const autor_original = sanitizeTexto(
    (input.autor_original ?? input.autor ?? input.author ?? input.a ?? 'Anônimo').split('\n')[0]
  );
  if (!frase_original || frase_original.length < 15 || frase_original.length > 600) return null;

  return {
    frase_original,
    autor_original,
    tags: Array.isArray(input.tags) ? input.tags : [],
    source: input.source || 'manual',
    sourceUrl: input.sourceUrl || input.fontes || null,
    apiTags: input.apiTags || [],
  };
}

export function buildBaseRecord(raw, usedSlugs = new Set()) {
  const today = new Date().toISOString().slice(0, 10);
  const mapped = mapTagsToContextos([...raw.tags, ...raw.apiTags]);
  const categoria = mapped[0] || 'inspiracional';
  const contextos = uniqueStrings(mapped.filter((c) => c !== categoria));
  const ctxFinal = contextos.length ? contextos : ['reflexao'];

  let slug = slugify(raw.slug || raw.frase_original.slice(0, 80));
  if (!slug) slug = 'frase';
  let candidate = slug;
  let n = 2;
  while (usedSlugs.has(candidate)) candidate = `${slug}-${n++}`;
  usedSlugs.add(candidate);

  const id = raw.id || hashId('f_api', raw.frase_original, raw.autor_original);

  return {
    id,
    slug: candidate,
    frase_original: raw.frase_original,
    autor_original: raw.autor_original,
    categoria,
    contextos: ctxFinal,
    explicacao: '',
    palavras_chave: uniqueStrings([categoria, ...ctxFinal]).slice(0, 8),
    autor_tipo: null,
    nacionalidade: null,
    nascimento_falecimento: null,
    ano_ou_data: null,
    fontes: raw.sourceUrl || null,
    observacao: raw.source ? `Importado via ${raw.source}.` : null,
    informacoes: {
      ultima_atualizacao: today,
      confiabilidade: 'api-import',
      curadoria_ia: false,
    },
  };
}

export function applyAuthorFacts(record, facts) {
  const key = normAutorKey(record.autor_original);
  const f = facts[key];
  if (!f) return record;
  return {
    ...record,
    autor_tipo: record.autor_tipo || f.autor_tipo || null,
    nacionalidade: record.nacionalidade || f.nacionalidade || null,
    nascimento_falecimento: record.nascimento_falecimento || f.nascimento_falecimento || null,
  };
}

export function mergeAiCuration(base, ai) {
  if (!ai) return base;
  const contextos = uniqueStrings(
    (ai.contextos || []).map((c) => slugify(c)).filter(Boolean)
  );
  const palavras = uniqueStrings([
    ...(ai.palavras_chave || []).map((p) => slugify(p)),
    ai.categoria ? slugify(ai.categoria) : '',
    ...contextos,
  ]).filter(Boolean);

  return {
    ...base,
    categoria: ai.categoria ? slugify(ai.categoria) : base.categoria,
    contextos: contextos.length ? contextos : base.contextos,
    explicacao: sanitizeTexto(ai.explicacao).slice(0, 500),
    ano_ou_data: ai.ano_ou_data ? String(ai.ano_ou_data).trim() : null,
    observacao: ai.observacao
      ? sanitizeTexto(ai.observacao)
      : base.observacao,
    palavras_chave: palavras.length ? palavras.slice(0, 8) : base.palavras_chave,
    autor_tipo: ai.autor_tipo ? slugify(ai.autor_tipo) : base.autor_tipo,
    nacionalidade: ai.nacionalidade ? slugify(ai.nacionalidade) : base.nacionalidade,
    nascimento_falecimento: ai.nascimento_falecimento
      ? String(ai.nascimento_falecimento).trim()
      : base.nascimento_falecimento,
    informacoes: {
      ...base.informacoes,
      confiabilidade: ai.confiabilidade || base.informacoes.confiabilidade,
      curadoria_ia: true,
    },
  };
}

export function buildCuratePrompt(batch) {
  const items = batch.map((b, i) => ({
    n: i + 1,
    id: b.id,
    frase: b.frase_original,
    autor: b.autor_original,
    fonte: b.fontes,
    origem_api: b.observacao,
  }));

  return `Você é curador editorial do site Metamensagem (frases e reflexão em português do Brasil).

Para cada citação abaixo, produza metadados editoriais em JSON. Regras:
- "explicacao": 2 a 4 frases em português brasileiro (máx. 420 caracteres) — contexto provável, por que foi dita ou como usar; não invente obra/data específica sem segurança.
- "categoria": um slug em minúsculas (ex.: inspiracional, amor, sabedoria, ciencia, vida, fe, coragem).
- "contextos": array de 2 a 5 slugs (motivacao, reflexao, otimismo, etc.).
- "palavras_chave": até 6 slugs alinhados ao conteúdo.
- "ano_ou_data": string só se houver base razoável (ano ou século); senão null.
- "autor_tipo", "nacionalidade", "nascimento_falecimento": preencha só se o autor for figura pública conhecida; senão null.
- "observacao": nota curta se atribuição for incerta, tradução implícita ou frase muito popular; senão null.
- "confiabilidade": "alta" | "media" | "baixa" (atribuição e contexto).

Responda APENAS JSON: array de objetos com os campos acima + "id" igual ao recebido, na mesma ordem.

Itens:
${JSON.stringify(items, null, 2)}`;
}

export function parseModelJsonArray(text) {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('Resposta sem array JSON');
  return JSON.parse(raw.slice(start, end + 1));
}
