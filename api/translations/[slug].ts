/**
 * GET /api/translations/:slug?locale=en — traduções via CDN.
 */
import { isSeoLocale, requestUrl, shardForSlug, type ApiRequest } from '../_shared.js';
import { sendJson, type ApiResponse } from '../_http.js';

type SeoLocale = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'hi';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const url = requestUrl(req);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = decodeURIComponent(parts[parts.length - 1] ?? '').toLowerCase();
  const locale = url.searchParams.get('locale');

  if (!slug) {
    sendJson(res, 400, { error: 'slug required' });
    return;
  }
  if (!locale || !isSeoLocale(locale)) {
    sendJson(res, 400, { error: 'locale query required (pt|en|es|...)' });
    return;
  }

  const shard = shardForSlug(slug);

  try {
    const resFetch = await fetch(`${url.origin}/frases-v2/translations/shard-${shard}.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!resFetch.ok) {
      sendJson(res, 404, { slug, locale, found: false });
      return;
    }
    const data = (await resFetch.json()) as Record<string, Partial<Record<SeoLocale, { text: string }>>>;
    const hit = data[slug]?.[locale as SeoLocale];
    if (!hit?.text) {
      sendJson(res, 404, { slug, locale, found: false });
      return;
    }
    sendJson(
      res,
      200,
      { slug, locale, found: true, text: hit.text },
      { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' }
    );
  } catch {
    sendJson(res, 404, { slug, locale, found: false });
  }
}
