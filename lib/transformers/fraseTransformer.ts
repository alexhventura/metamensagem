/**
 * Transformação CSV → schema canônico Metamensagem.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { FraseCanonical, RawApiQuote } from '../frases/canonical';
import { slugify } from '../utils/slugify';
import { normalizeAuthorName } from '../importers/csvParser';

const AUTHOR_FACTS_PATH = path.join(process.cwd(), 'data', 'frases-author-facts.json');

const TAG_SLUG: Record<string, string> = {
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
  filosofia: 'filosofia',
  ciencia: 'ciencia',
  ciência: 'ciencia',
  vida: 'vida',
  aprendizado: 'aprendizado',
  friendship: 'amizade',
  friend: 'amizade',
  inspirational: 'inspiracional',
  life: 'vida',
  truth: 'verdade',
  peace: 'paz',
  hope: 'esperanca',
  courage: 'coragem',
  wisdom: 'sabedoria',
  best: 'inspiracional',
  'attributed-no-source': 'inspiracional',
};

function normAutorKey(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function tagSlug(tag: string): string {
  const k = slugify(tag);
  return TAG_SLUG[k] || k;
}

function unique(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

export function hashFraseId(text: string, author: string): string {
  const h = crypto.createHash('sha1').update(`${text}|${author}`).digest('hex').slice(0, 10);
  return `f_csv_${h}`;
}

export function loadAuthorFacts(): Record<
  string,
  { autor_tipo?: string; nacionalidade?: string; nascimento_falecimento?: string }
> {
  if (!fs.existsSync(AUTHOR_FACTS_PATH)) return {};
  const raw = JSON.parse(fs.readFileSync(AUTHOR_FACTS_PATH, 'utf8')) as Record<string, unknown>;
  const out: Record<string, { autor_tipo?: string; nacionalidade?: string; nascimento_falecimento?: string }> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (key.startsWith('_') || !val || typeof val !== 'object') continue;
    out[normAutorKey(key)] = val as { autor_tipo?: string; nacionalidade?: string; nascimento_falecimento?: string };
  }
  return out;
}

export function buildFraseFromRaw(raw: RawApiQuote, usedSlugs: Set<string>): FraseCanonical {
  const today = new Date().toISOString().slice(0, 10);
  const frase_original = raw.quote.trim();
  const autor_original = normalizeAuthorName(raw.author);

  const mapped = unique([...(raw.tags ?? []), ...(raw.apiTags ?? [])].map(tagSlug));
  const categoria = mapped.find((t) => !t.includes('attributed')) || mapped[0] || 'inspiracional';
  const contextos = unique(mapped.filter((c) => c !== categoria && c !== 'attributed-no-source'));
  const ctxFinal = contextos.length ? contextos.slice(0, 6) : ['reflexao'];

  let slug = slugify(frase_original.slice(0, 80)) || 'frase';
  let candidate = slug;
  let n = 2;
  while (usedSlugs.has(candidate)) candidate = `${slug}-${n++}`;
  usedSlugs.add(candidate);

  const facts = loadAuthorFacts()[normAutorKey(autor_original)];

  return {
    id: hashFraseId(frase_original, autor_original),
    slug: candidate,
    frase_original,
    autor_original,
    categoria,
    contextos: ctxFinal,
    explicacao: '',
    palavras_chave: unique([categoria, ...ctxFinal]).slice(0, 8),
    autor_tipo: facts?.autor_tipo ? slugify(facts.autor_tipo) : null,
    nacionalidade: facts?.nacionalidade ? slugify(facts.nacionalidade) : null,
    nascimento_falecimento: facts?.nascimento_falecimento || null,
    ano_ou_data: null,
    fontes: raw.sourceUrl || null,
    observacao: null,
    informacoes: {
      ultima_atualizacao: today,
      confiabilidade: 'alta',
      curadoria_ia: false,
      origem_import: raw.source || 'csv-import',
    },
  };
}

export function fallbackExplicacao(b: FraseCanonical): string {
  const ctx = b.contextos.slice(0, 2).join(' e ') || b.categoria;
  return `Citação atribuída a ${b.autor_original}, integrada ao acervo Metamensagem. Convida à reflexão sobre ${ctx}, no espírito da ${b.categoria}.`;
}

export interface AiCurationPatch {
  id: string;
  explicacao?: string;
  categoria?: string;
  contextos?: string[];
  palavras_chave?: string[];
  autor_tipo?: string | null;
  nacionalidade?: string | null;
  nascimento_falecimento?: string | null;
  ano_ou_data?: string | null;
  observacao?: string | null;
  confiabilidade?: string | null;
}

export function mergeCurationIntoFrase(base: FraseCanonical, ai?: AiCurationPatch): FraseCanonical {
  if (!ai) return base;

  const ctxList = Array.isArray(ai.contextos) ? ai.contextos : ai.contextos ? [String(ai.contextos)] : [];
  const contextos = unique(ctxList.map(tagSlug));
  const palavras_chave = unique([
    ...(Array.isArray(ai.palavras_chave) ? ai.palavras_chave : []).map(tagSlug),
    ai.categoria ? tagSlug(ai.categoria) : '',
    ...contextos,
  ]).filter(Boolean);

  return {
    ...base,
    categoria: ai.categoria ? tagSlug(ai.categoria) : base.categoria,
    contextos: contextos.length ? contextos : base.contextos,
    explicacao: (ai.explicacao || '').trim().slice(0, 500),
    palavras_chave: palavras_chave.length ? palavras_chave.slice(0, 8) : base.palavras_chave,
    autor_tipo: ai.autor_tipo ? tagSlug(ai.autor_tipo) : base.autor_tipo,
    nacionalidade: ai.nacionalidade ? slugify(ai.nacionalidade) : base.nacionalidade,
    nascimento_falecimento: ai.nascimento_falecimento?.trim() || base.nascimento_falecimento,
    ano_ou_data: ai.ano_ou_data?.trim() || null,
    observacao: ai.observacao?.trim() || base.observacao,
    informacoes: {
      ...base.informacoes,
      confiabilidade: ai.confiabilidade || base.informacoes.confiabilidade,
      curadoria_ia: true,
    },
  };
}

export function transformRawQuotesToFrases(
  rawList: RawApiQuote[],
  usedSlugs: Set<string> = new Set()
): FraseCanonical[] {
  return rawList.map((r) => buildFraseFromRaw(r, usedSlugs));
}

export function finalizeFrase(frase: FraseCanonical): FraseCanonical {
  return {
    ...frase,
    explicacao: frase.explicacao?.trim() || fallbackExplicacao(frase),
  };
}

export function rawFromLegacyInput(input: {
  quote?: string;
  author?: string;
  texto?: string;
  autor?: string;
  tags?: string[];
  source?: string;
  sourceUrl?: string | null;
}): import('../frases/canonical').RawApiQuote | null {
  const quote = (input.quote || input.texto || '').trim();
  const author = (input.author || input.autor || 'Anônimo').trim();
  if (!quote || quote.length < 15) return null;
  return {
    quote,
    author,
    tags: input.tags || [],
    apiTags: [],
    source: input.source || 'csv-import',
    sourceUrl: input.sourceUrl ?? null,
  };
}
