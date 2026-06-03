/**
 * GET /api/seo/frase?slug=... | ?id=...
 * HTML mínimo com title, description, OG e JSON-LD para crawlers (WhatsApp, Google, etc.).
 */
import { SITE_ORIGIN } from '../../lib/seo/url.js';
import { requestUrl, sendText, type ApiRequest, type ApiResponse } from '../_http.js';
import { getServerSupabase } from '../_supabaseServer.js';
import { resolveFraseDetailBySlug } from '../fraseDetailService.js';

const CACHE_HIT = 'public, max-age=86400, stale-while-revalidate=604800';
const CACHE_MISS = 'public, max-age=300';

const FRASE_SELECT =
  'id,slug,frase_original,autor_original,categoria,explicacao,ano_ou_data';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function ogImageUrl(phraseId: string): string {
  return `${SITE_ORIGIN}/imagem/${encodeURIComponent(phraseId.trim())}`;
}

function buildSeoHtml(input: {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  quoteText: string;
  author: string;
}): string {
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const canonical = escapeHtml(input.canonical);
  const ogImage = escapeHtml(input.ogImage);
  const jsonLd = escapeHtml(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Quotation',
      text: input.quoteText,
      name: truncate(input.quoteText, 120),
      author: { '@type': 'Person', name: input.author },
      url: input.canonical,
      isPartOf: { '@type': 'WebSite', name: 'Metamensagem', url: SITE_ORIGIN },
    })
  );

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Metamensagem" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <article>
    <h1>${escapeHtml(input.quoteText)}</h1>
    <p>— ${escapeHtml(input.author)}</p>
    <p><a href="${canonical}">Ver em Metamensagem</a></p>
  </article>
</body>
</html>`;
}

async function resolveById(id: string, origin: string) {
  const key = id.trim();
  if (!key) return null;

  const sb = getServerSupabase();
  if (sb) {
    const { data } = await sb.from('frases').select(FRASE_SELECT).eq('id', key).maybeSingle();
    if (data?.frase_original) {
      return {
        id: String(data.id),
        slug: String(data.slug),
        frase_original: String(data.frase_original),
        autor_original: String(data.autor_original ?? 'Anônimo'),
        explicacao: String(data.explicacao ?? ''),
        ano_ou_data: (data.ano_ou_data as string | null) ?? null,
      };
    }
  }

  try {
    const idx = await fetch(`${origin.replace(/\/$/, '')}/frases-v2/id-index.json`);
    if (idx.ok) {
      const map = (await idx.json()) as Record<string, string>;
      const slug = map[key];
      if (slug) return resolveFraseDetailBySlug(slug, origin);
    }
  } catch {
    /* id-index opcional */
  }

  return null;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendText(res, 405, 'Method not allowed');
    return;
  }

  const url = requestUrl(req);
  const slugParam = decodeURIComponent(url.searchParams.get('slug') ?? '').toLowerCase().trim();
  const idParam = decodeURIComponent(url.searchParams.get('id') ?? '').trim();

  try {
    const frase = slugParam
      ? await resolveFraseDetailBySlug(slugParam, url.origin)
      : idParam
        ? await resolveById(idParam, url.origin)
        : null;

    if (!frase?.frase_original?.trim()) {
      sendText(res, 404, 'Frase não encontrada', { 'Cache-Control': CACHE_MISS });
      return;
    }

    const quote = frase.frase_original.trim();
    const author = (frase.autor_original || 'Anônimo').trim();
    const title = `${truncate(quote, 72)} | ${author} | Metamensagem`;
    const description =
      frase.explicacao?.trim() ||
      `Frase de ${author}${frase.ano_ou_data ? ` (${frase.ano_ou_data})` : ''}. Reflexão e compartilhamento em Metamensagem.`;
    const canonical = `${SITE_ORIGIN}/frases/${encodeURIComponent(frase.slug)}`;

    sendText(
      res,
      200,
      buildSeoHtml({
        title,
        description: truncate(description, 160),
        canonical,
        ogImage: ogImageUrl(frase.id),
        quoteText: quote,
        author,
      }),
      {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': CACHE_HIT,
      }
    );
  } catch (err) {
    console.error('[seo/frase]', slugParam || idParam, err);
    sendText(res, 404, 'Frase não encontrada', { 'Cache-Control': CACHE_MISS });
  }
}
