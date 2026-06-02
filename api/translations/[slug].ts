/**
 * GET /api/translations/:slug?locale=en — lê shard estático de traduções (CDN).
 */
export const config = {
  runtime: 'nodejs',
};

import { shardForSlug } from '../../lib/utils/shardForSlug';
import { isSeoLocale, type SeoLocale } from '../../lib/i18n/locales';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
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
  const filePath = join(process.cwd(), 'public', 'frases-v2', 'translations', `shard-${shard}.json`);

  try {
    const raw = await readFile(filePath, 'utf8');
    const data = JSON.parse(raw) as Record<string, Partial<Record<SeoLocale, { text: string }>>>;
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
