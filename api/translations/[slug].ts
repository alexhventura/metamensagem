/**
 * GET /api/translations/:slug?locale=en — traduções via CDN.
 */
import { isSeoLocale, requestUrl, shardForSlug } from '../_shared';

type SeoLocale = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'hi';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = requestUrl(req);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = decodeURIComponent(parts[parts.length - 1] ?? '').toLowerCase();
  const locale = url.searchParams.get('locale');

  if (!slug) {
    return Response.json({ error: 'slug required' }, { status: 400 });
  }
  if (!locale || !isSeoLocale(locale)) {
    return Response.json({ error: 'locale query required (pt|en|es|...)' }, { status: 400 });
  }

  const shard = shardForSlug(slug);

  try {
    const res = await fetch(`${url.origin}/frases-v2/translations/shard-${shard}.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return Response.json({ slug, locale, found: false }, { status: 404 });
    }
    const data = (await res.json()) as Record<string, Partial<Record<SeoLocale, { text: string }>>>;
    const hit = data[slug]?.[locale as SeoLocale];
    if (!hit?.text) {
      return Response.json({ slug, locale, found: false }, { status: 404 });
    }
    return Response.json(
      { slug, locale, found: true, text: hit.text },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch {
    return Response.json({ slug, locale, found: false }, { status: 404 });
  }
}
