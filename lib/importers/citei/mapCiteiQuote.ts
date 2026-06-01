import type { RawApiQuote } from '../../frases/canonical';
import { fixCsvEncoding, normalizeAuthorName } from '../csvParser';
import type { CiteiQuoteRaw } from './types';

function extractId(raw: CiteiQuoteRaw): string | null {
  if (!raw._id) return null;
  if (typeof raw._id === 'string') return raw._id;
  if (typeof raw._id === 'object' && raw._id.$oid) return raw._id.$oid;
  return null;
}

export function citeiQuoteToRaw(raw: CiteiQuoteRaw, sourceUrl?: string | null): RawApiQuote | null {
  const quote = fixCsvEncoding(String(raw.text || '').trim());
  const author = normalizeAuthorName(String(raw.author || '').trim() || 'Anônimo');
  if (!quote || quote.length < 15) return null;

  const tags: string[] = [];
  if (raw.categoryslug) tags.push(String(raw.categoryslug).trim());
  else if (raw.category) tags.push(String(raw.category).trim());

  return {
    quote,
    author,
    tags,
    apiTags: [],
    source: 'citei-api',
    sourceUrl: sourceUrl || (extractId(raw) ? `citei:${extractId(raw)}` : null),
  };
}

export function isCiteiQuoteObject(obj: unknown): obj is CiteiQuoteRaw {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as CiteiQuoteRaw;
  return Boolean(o.text && o.author);
}
