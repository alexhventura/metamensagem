/**
 * Camada 1 — busca citações em APIs externas (qualquer idioma).
 */

import type { RawApiQuote } from '../frases/canonical';

export type QuoteSourceId = 'dummyjson' | 'zenquotes' | 'wikiquote' | 'quotable' | 'ninjas';

export interface FetchQuotesOptions {
  sources?: QuoteSourceId[];
  limitPerSource?: number;
  maxTotal?: number;
}

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (compatible; MetaMensagem/1.0; +https://metamensagem.com)',
  Accept: 'application/json',
};

const QUOTABLE_TAG_MAP: Record<string, string[]> = {
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
  science: ['Aprendizado', 'Sabedoria'],
  motivational: ['Motivacao', 'Inspiracional'],
};

const WIKI_CATEGORIES = [
  'Categoria:Amor',
  'Categoria:Motivação',
  'Categoria:Vida',
  'Categoria:Sabedoria',
  'Categoria:Coragem',
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanText(s: string): string {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2 || $1')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidQuote(text: string): boolean {
  if (!text || text.length < 20 || text.length > 600) return false;
  if (/^https?:\/\//i.test(text)) return false;
  return true;
}

function toRaw(
  quote: string,
  author: string,
  source: string,
  tags: string[] = [],
  apiTags: string[] = [],
  sourceUrl?: string
): RawApiQuote | null {
  const q = cleanText(quote);
  const a = cleanText(author) || 'Anônimo';
  if (!isValidQuote(q)) return null;
  return { quote: q, author: a, tags, apiTags, source, sourceUrl };
}

async function fetchJson<T>(url: string, extraHeaders?: Record<string, string>): Promise<T> {
  const res = await fetch(url, { headers: { ...HEADERS, ...extraHeaders } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchFromDummyJson(limit: number): Promise<RawApiQuote[]> {
  const out: RawApiQuote[] = [];
  let skip = 0;
  const page = 50;
  while (out.length < limit && skip < 400) {
    const data = await fetchJson<{ quotes: { quote: string; author: string }[] }>(
      `https://dummyjson.com/quotes?limit=${page}&skip=${skip}`
    );
    for (const row of data.quotes || []) {
      const item = toRaw(row.quote, row.author, 'dummyjson', ['Inspiracional', 'Reflexao'], [], 'https://dummyjson.com/docs/quotes');
      if (item) out.push(item);
      if (out.length >= limit) break;
    }
    skip += page;
    if (!data.quotes?.length) break;
    await sleep(250);
  }
  return out;
}

export async function fetchFromZenQuotes(limit: number): Promise<RawApiQuote[]> {
  try {
    await sleep(1000);
    const data = await fetchJson<{ q: string; a: string }[]>('https://zenquotes.io/api/quotes', {
      Referer: 'https://metamensagem.com/',
    });
    const out: RawApiQuote[] = [];
    for (const row of data || []) {
      const item = toRaw(row.q, row.a, 'zenquotes', ['Inspiracional', 'Motivacao'], [], 'https://zenquotes.io/');
      if (item) out.push(item);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchFromQuotable(limit: number): Promise<RawApiQuote[]> {
  try {
    const data = await fetchJson<{
      results: { content: string; author: string; tags?: string[] }[];
    }>(`https://api.quotable.io/quotes?limit=${Math.min(limit, 50)}&maxLength=280`);
    const out: RawApiQuote[] = [];
    for (const row of data.results || []) {
      const tags = new Set<string>(['Inspiracional']);
      for (const t of row.tags || []) {
        for (const m of QUOTABLE_TAG_MAP[t] || []) tags.add(m);
      }
      const item = toRaw(
        row.content,
        row.author,
        'quotable',
        [...tags],
        row.tags || [],
        'https://github.com/lukePeavey/quotable'
      );
      if (item) out.push(item);
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchFromWikiquote(limit: number): Promise<RawApiQuote[]> {
  const out: RawApiQuote[] = [];
  const api = 'https://pt.wikiquote.org/w/api.php';
  const perCat = Math.max(3, Math.ceil(limit / WIKI_CATEGORIES.length));

  for (const category of WIKI_CATEGORIES) {
    if (out.length >= limit) break;
    try {
      await sleep(500);
      const list = await fetchJson<{
        query: { categorymembers: { title: string }[] };
      }>(
        `${api}?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmlimit=10&cmtype=page&format=json`
      );
      for (const m of list.query?.categorymembers || []) {
        if (out.length >= limit) break;
        try {
          const ext = await fetchJson<{
            query: { pages: Record<string, { extract?: string }> };
          }>(
            `${api}?action=query&prop=extracts&explaintext=1&exchars=320&titles=${encodeURIComponent(m.title)}&format=json`
          );
          const page = Object.values(ext.query?.pages || {})[0];
          const lines = cleanText(page?.extract || '')
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length >= 25 && l.length <= 400);

          const catTags =
            category.includes('Amor')
              ? ['Amor', 'Inspiracional']
              : category.includes('Motiva')
                ? ['Motivacao', 'Inspiracional']
                : category.includes('Sabedoria')
                  ? ['Sabedoria', 'Reflexao']
                  : ['Reflexao', 'Inspiracional'];

          for (const line of lines.slice(0, perCat)) {
            const item = toRaw(
              line.replace(/^[-–—]\s*/, ''),
              m.title.replace(/^Citação:/i, '').trim() || 'Wikiquote',
              'wikiquote',
              catTags,
              [],
              `https://pt.wikiquote.org/wiki/${encodeURIComponent(m.title.replace(/ /g, '_'))}`
            );
            if (item) {
              out.push(item);
              if (out.length >= limit) break;
            }
          }
          await sleep(300);
        } catch {
          /* página */
        }
      }
    } catch {
      /* categoria */
    }
  }
  return out;
}

export async function fetchFromApiNinjas(limit: number, apiKey?: string): Promise<RawApiQuote[]> {
  if (!apiKey) return [];
  const out: RawApiQuote[] = [];
  const categories = ['inspirational', 'success', 'wisdom', 'life', 'happiness'];
  for (const cat of categories) {
    if (out.length >= limit) break;
    try {
      const data = await fetchJson<{ quote: string; author: string }[]>(
        `https://api.api-ninjas.com/v1/quotes?category=${cat}&limit=${Math.min(5, limit)}`,
        { 'X-Api-Key': apiKey }
      );
      for (const row of data || []) {
        const item = toRaw(row.quote, row.author, 'api-ninjas', [cat], [], 'https://api-ninjas.com/api/quotes');
        if (item) out.push(item);
        if (out.length >= limit) break;
      }
      await sleep(400);
    } catch {
      /* categoria */
    }
  }
  return out;
}

export function dedupeRawQuotes(items: RawApiQuote[]): RawApiQuote[] {
  const seen = new Set<string>();
  const out: RawApiQuote[] = [];
  for (const item of items) {
    const key = item.quote.toLowerCase().slice(0, 100);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export async function fetchQuotesFromApis(options: FetchQuotesOptions = {}): Promise<RawApiQuote[]> {
  const sources: QuoteSourceId[] =
    options.sources || ['wikiquote', 'dummyjson', 'zenquotes', 'quotable', 'ninjas'];
  const maxTotal = options.maxTotal ?? 80;
  const perSource = options.limitPerSource ?? Math.ceil(maxTotal / sources.length);

  const chunks: RawApiQuote[][] = [];
  const ninjasKey = process.env.API_NINJAS_KEY || process.env.NINJAS_API_KEY;

  for (const src of sources) {
    switch (src) {
      case 'dummyjson':
        chunks.push(await fetchFromDummyJson(perSource));
        break;
      case 'zenquotes':
        chunks.push(await fetchFromZenQuotes(Math.min(perSource, 25)));
        break;
      case 'quotable':
        chunks.push(await fetchFromQuotable(perSource));
        break;
      case 'wikiquote':
        chunks.push(await fetchFromWikiquote(perSource));
        break;
      case 'ninjas':
        chunks.push(await fetchFromApiNinjas(perSource, ninjasKey));
        break;
    }
  }

  return dedupeRawQuotes(chunks.flat()).slice(0, maxTotal);
}
