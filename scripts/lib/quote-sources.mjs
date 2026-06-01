/**
 * Fontes externas de citações (reutilizado na curadoria).
 */

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; MetaMensagem/1.0; +https://metamensagem.com)',
  Accept: 'application/json',
};

const QUOTABLE_TAG_MAP = {
  wisdom: ['Sabedoria', 'Reflexao'],
  inspirational: ['Inspiracional', 'Motivacao'],
  success: ['Sucesso', 'Motivacao'],
  happiness: ['Felicidade', 'Otimismo'],
  love: ['Amor'],
  life: ['Reflexao', 'Inspiracional'],
  faith: ['Fe'],
  hope: ['Fe', 'Otimismo'],
  friendship: ['Amor', 'Inspiracional'],
  courage: ['Coragem', 'Superacao'],
  philosophy: ['Sabedoria', 'Reflexao'],
  history: ['Sabedoria', 'Aprendizado'],
  science: ['Aprendizado', 'Sabedoria'],
  motivational: ['Motivacao', 'Inspiracional'],
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

function safeText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

function cleanText(s) {
  return safeText(s)
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2 || $1')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidQuote(texto) {
  if (!texto || texto.length < 25 || texto.length > 600) return false;
  if (/^https?:\/\//i.test(texto)) return false;
  return true;
}

function mapQuotableTags(tags = []) {
  const out = new Set(['Inspiracional']);
  for (const t of tags) {
    for (const mapped of QUOTABLE_TAG_MAP[t] || []) out.add(mapped);
  }
  return [...out];
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...FETCH_HEADERS, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

export async function fetchDummyJsonQuotes(maxItems = 80) {
  const items = [];
  const limit = 50;
  let skip = 0;
  while (items.length < maxItems && skip < 500) {
    const data = await fetchJson(`https://dummyjson.com/quotes?limit=${limit}&skip=${skip}`);
    for (const q of data.quotes || []) {
      const texto = cleanText(q.quote);
      if (!isValidQuote(texto)) continue;
      items.push({
        frase_original: texto,
        autor_original: cleanText(q.author) || 'Anônimo',
        tags: ['Inspiracional', 'Reflexao'],
        apiTags: [],
        source: 'dummyjson',
        sourceUrl: 'https://dummyjson.com/docs/quotes',
      });
      if (items.length >= maxItems) break;
    }
    skip += limit;
    if (!data.quotes?.length) break;
    await sleep(300);
  }
  return items;
}

export async function fetchZenQuotes(maxItems = 30) {
  try {
    await sleep(1200);
    const data = await fetchJson('https://zenquotes.io/api/quotes', {
      headers: { ...FETCH_HEADERS, Referer: 'https://metamensagem.com/' },
    });
    if (!Array.isArray(data)) return [];
    const items = [];
    for (const q of data) {
      const texto = cleanText(q.q);
      if (!isValidQuote(texto)) continue;
      items.push({
        frase_original: texto,
        autor_original: cleanText(q.a) || 'Anônimo',
        tags: ['Inspiracional', 'Motivacao'],
        apiTags: [],
        source: 'zenquotes',
        sourceUrl: 'https://zenquotes.io/',
      });
      if (items.length >= maxItems) break;
    }
    return items;
  } catch {
    return [];
  }
}

export async function fetchWikiquotePt(maxPerCategory = 6) {
  const items = [];
  const api = 'https://pt.wikiquote.org/w/api.php';

  for (const category of WIKI_CATEGORIES) {
    try {
      await sleep(600);
      const list = await fetchJson(
        `${api}?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmlimit=12&cmtype=page&format=json`
      );
      const members = list.query?.categorymembers || [];

      for (const m of members.slice(0, 12)) {
        try {
          const ext = await fetchJson(
            `${api}?action=query&prop=extracts&explaintext=1&exchars=350&titles=${encodeURIComponent(m.title)}&format=json`
          );
          const page = Object.values(ext.query?.pages || {})[0];
          const extract = cleanText(page?.extract || '');
          const lines = extract
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length >= 30 && l.length <= 400);

          const catTags =
            category.includes('Amor')
              ? ['Amor', 'Inspiracional']
              : category.includes('Motiva')
                ? ['Motivacao', 'Inspiracional']
                : category.includes('Sabedoria')
                  ? ['Sabedoria', 'Reflexao']
                  : ['Reflexao', 'Inspiracional'];

          for (const line of lines.slice(0, maxPerCategory)) {
            const texto = line.replace(/^[-–—]\s*/, '');
            if (!isValidQuote(texto)) continue;
            items.push({
              frase_original: texto,
              autor_original: m.title.replace(/^Citação:/i, '').trim() || 'Wikiquote',
              tags: catTags,
              apiTags: [],
              source: 'wikiquote-pt',
              sourceUrl: `https://pt.wikiquote.org/wiki/${encodeURIComponent(m.title.replace(/ /g, '_'))}`,
            });
          }
          await sleep(350);
        } catch {
          /* página */
        }
      }
    } catch {
      /* categoria */
    }
  }
  return items;
}

export async function fetchQuotable(maxItems = 40) {
  const items = [];
  try {
    const data = await fetchJson(
      `https://api.quotable.io/quotes?limit=${Math.min(maxItems, 50)}&maxLength=280`
    );
    for (const q of data.results || []) {
      const texto = cleanText(q.content);
      if (!isValidQuote(texto)) continue;
      items.push({
        frase_original: texto,
        autor_original: cleanText(q.author) || 'Anônimo',
        tags: mapQuotableTags(q.tags),
        apiTags: q.tags || [],
        source: 'quotable',
        sourceUrl: 'https://github.com/lukePeavey/quotable',
      });
    }
  } catch {
    /* indisponível */
  }
  return items;
}

export function dedupeRawItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.frase_original.toLowerCase().slice(0, 100);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export async function fetchAllSources({ limit = 60 } = {}) {
  const per = Math.ceil(limit / 3);
  const [dj, wiki, zq, qt] = await Promise.all([
    fetchDummyJsonQuotes(per),
    fetchWikiquotePt(5),
    fetchZenQuotes(Math.min(20, per)),
    fetchQuotable(Math.min(30, per)),
  ]);
  return dedupeRawItems([...wiki, ...dj, ...zq, ...qt]).slice(0, limit);
}
