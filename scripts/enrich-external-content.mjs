/**
 * Enriquecimento silencioso do acervo (build/CI).
 * Fontes: Quotable, ZenQuotes, Wikiquote (PT).
 * Saída: public/frases-enriched-cache.json (mesmo schema do índice de frases).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CACHE_FILE = path.join(ROOT, 'public', 'frases-enriched-cache.json');
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FORCE = process.argv.includes('--force');

const QUOTABLE_TAG_MAP = {
  wisdom: ['Sabedoria', 'Reflexao'],
  inspirational: ['Inspiracional', 'Motivacao'],
  success: ['Sucesso', 'Motivacao', 'Determinacao'],
  happiness: ['Felicidade', 'Otimismo'],
  love: ['Amor'],
  life: ['Reflexao', 'Inspiracional'],
  faith: ['Fe'],
  hope: ['Fe', 'Otimismo'],
  friendship: ['Amor', 'Inspiracional'],
  courage: ['Coragem', 'Superacao'],
  philosophy: ['Sabedoria', 'Reflexao'],
  history: ['Sabedoria', 'Aprendizado'],
  technology: ['Foco', 'Estrategia'],
  science: ['Aprendizado', 'Sabedoria'],
  motivational: ['Motivacao', 'Inspiracional'],
  famousquotes: ['Inspiracional', 'Reflexao'],
};

const WIKI_CATEGORIES = [
  'Categoria:Amor',
  'Categoria:Motivação',
  'Categoria:Vida',
  'Categoria:Feliz',
  'Categoria:Sabedoria',
  'Categoria:Coragem',
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashId(prefix, text) {
  const h = crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);
  return `${prefix}_${h}`;
}

function safeText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
}

function safeTags(value) {
  if (!Array.isArray(value)) return [];
  return value.map(safeText).filter(Boolean);
}

function cleanText(s) {
  const raw = safeText(s);
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2 || $1')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanAuthor(s) {
  const a = cleanText(s || 'Anônimo');
  return a.length > 120 ? a.slice(0, 117) + '...' : a;
}

function mapQuotableTags(tags = []) {
  const out = new Set(['Inspiracional']);
  for (const t of safeTags(tags)) {
    for (const mapped of QUOTABLE_TAG_MAP[t] || []) out.add(mapped);
  }
  return [...out].slice(0, 5);
}

function isValidQuote(texto) {
  if (!texto || texto.length < 25 || texto.length > 600) return false;
  if (/^https?:\/\//i.test(texto)) return false;
  if (/[{}\[\]|<>]/.test(texto) && texto.includes('{{')) return false;
  return true;
}

function normalizeItem({ texto, autor, tags, source }) {
  const t = cleanText(texto);
  if (!isValidQuote(t)) return null;
  return {
    id: hashId(`f_${source}`, t),
    tipo: 'frase',
    texto: t,
    autor: cleanAuthor(autor),
    tags: tags?.length ? tags : ['Inspiracional', 'Reflexao'],
    _source: source,
  };
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; MetaMensagem/1.0; +https://metamensagem.com)',
  Accept: 'application/json',
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...FETCH_HEADERS, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function fetchQuotable(limit = 750) {
  const items = [];
  const perPage = 150;
  const pages = Math.ceil(limit / perPage);

  for (let page = 1; page <= pages; page++) {
    try {
      const data = await fetchJson(
        `https://api.quotable.io/quotes?limit=${perPage}&page=${page}&maxLength=280`
      );
      for (const q of data.results || []) {
        const item = normalizeItem({
          texto: q.content,
          autor: q.author,
          tags: mapQuotableTags(q.tags),
          source: 'qt',
        });
        if (item) items.push(item);
      }
      if (!data.results?.length) break;
      await sleep(400);
    } catch (e) {
      console.warn('⚠ Quotable página', page, e.message);
      break;
    }
  }
  return items;
}

/** Principal fonte estável (Quotable está fora do ar na maioria dos ambientes). */
async function fetchDummyJsonQuotesPaginated(maxItems = 900) {
  const items = [];
  const limit = 100;
  let skip = 0;
  let total = maxItems;

  try {
    while (items.length < maxItems && skip < total) {
      const data = await fetchJson(
        `https://dummyjson.com/quotes?limit=${limit}&skip=${skip}`
      );
      total = Math.min(data.total || maxItems, maxItems);
      for (const q of data.quotes || []) {
        const item = normalizeItem({
          texto: q.quote,
          autor: q.author,
          tags: ['Inspiracional', 'Reflexao'],
          source: 'dj',
        });
        if (item) items.push(item);
      }
      skip += limit;
      if (!data.quotes?.length) break;
      await sleep(300);
    }
  } catch (e) {
    console.warn('⚠ DummyJSON:', e.message);
  }
  return items;
}

async function fetchZenQuotes() {
  try {
    await sleep(1500);
    const data = await fetchJson('https://zenquotes.io/api/quotes', {
      headers: { ...FETCH_HEADERS, Referer: 'https://metamensagem.com/' },
    });
    if (!Array.isArray(data)) return [];
    return data
      .map((q) =>
        normalizeItem({
          texto: q.q,
          autor: q.a,
          tags: ['Inspiracional', 'Motivacao', 'Reflexao'],
          source: 'zq',
        })
      )
      .filter(Boolean);
  } catch (e) {
    console.warn('⚠ ZenQuotes:', e.message);
    return [];
  }
}

async function fetchWikiquotePt() {
  const items = [];
  const api = 'https://pt.wikiquote.org/w/api.php';

  for (const category of WIKI_CATEGORIES) {
    try {
      await sleep(800);
      const list = await fetchJson(
        `${api}?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmlimit=15&cmtype=page&format=json`
      );
      const members = list.query?.categorymembers || [];

      for (const m of members.slice(0, 15)) {
        try {
          const ext = await fetchJson(
            `${api}?action=query&prop=extracts&explaintext=1&exchars=400&titles=${encodeURIComponent(m.title)}&format=json`
          );
          const pages = ext.query?.pages || {};
          const page = Object.values(pages)[0];
          const extract = cleanText(page?.extract || '');
          if (!extract) continue;

          const lines = extract
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length >= 30 && l.length <= 400 && !l.startsWith('=='));

          const catTag =
            category.includes('Amor')
              ? ['Amor', 'Inspiracional']
              : category.includes('Motiva')
                ? ['Motivacao', 'Inspiracional']
                : category.includes('Sabedoria')
                  ? ['Sabedoria', 'Reflexao']
                  : category.includes('Coragem')
                    ? ['Coragem', 'Superacao']
                    : ['Reflexao', 'Inspiracional'];

          for (const line of lines.slice(0, 8)) {
            const item = normalizeItem({
              texto: line.replace(/^[-–—]\s*/, ''),
              autor: m.title.replace(/^Citação:/i, '').trim() || 'Wikiquote',
              tags: catTag,
              source: 'wq',
            });
            if (item) items.push(item);
          }
          await sleep(350);
        } catch {
          /* página individual */
        }
      }
    } catch (e) {
      console.warn('⚠ Wikiquote', category, e.message);
    }
  }
  return items;
}

function dedupeItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item?.texto) continue;
    const key = safeText(item.texto).toLowerCase().slice(0, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const { _source, ...rest } = item;
    out.push(rest);
  }
  return out;
}

async function run() {
  if (fs.existsSync(CACHE_FILE) && !FORCE) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const age = Date.now() - new Date(cache.updatedAt || 0).getTime();
    if (age < CACHE_MAX_AGE_MS && cache.items?.length) {
      console.log(`✅ Cache enriquecido válido (${cache.items.length} itens, ${Math.round(age / 86400000)}d)`);
      return;
    }
  }

  console.log('🌐 Enriquecendo acervo (APIs externas → cache local)...');

  const quotable = await fetchQuotable(150);
  const dummyjson = await fetchDummyJsonQuotesPaginated(900);
  const zen = await fetchZenQuotes();
  const wiki = await fetchWikiquotePt();

  const merged = dedupeItems([...dummyjson, ...zen, ...wiki, ...quotable]);
  const payload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    apiStatus: {
      quotable: quotable.length > 0 ? 'ok' : 'indisponivel',
      dummyjson: dummyjson.length > 0 ? 'ok' : 'falhou',
      zenquotes: zen.length > 0 ? 'ok' : 'falhou',
      wikiquote: wiki.length > 0 ? 'ok' : 'limitado',
    },
    sources: {
      quotable: quotable.length,
      dummyjson: dummyjson.length,
      zenquotes: zen.length,
      wikiquote: wiki.length,
    },
    items: merged,
  };

  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload), 'utf8');
  console.log(
    `✅ frases-enriched-cache.json — ${merged.length} frases (dj:${dummyjson.length} zq:${zen.length} wq:${wiki.length} qt:${quotable.length})`
  );
}

run().catch((e) => {
  console.error('❌ enrich-external-content:', e);
  if (!fs.existsSync(CACHE_FILE)) process.exit(1);
  console.warn('⚠ Mantendo cache anterior.');
});
