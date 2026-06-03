/**
 * Edge middleware: crawlers em rotas de frase recebem HTML com OG/SEO sem depender do React.
 */
const CRAWLER_UA =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|twitterbot|linkedinbot|pinterest|slackbot|telegrambot|discordbot|embedly|quora link preview|vkshare|w3c_validator|bingpreview|google-inspectiontool/i;

const LOCALE_PREFIX = /^(en|es|fr|de|it|ja|hi)$/;

function parseFrasePath(pathname: string): { slug?: string; id?: string } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'f' && parts[1]) {
    return { id: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'frases' && parts[1]) {
    return { slug: decodeURIComponent(parts[1]) };
  }
  if (parts.length >= 3 && LOCALE_PREFIX.test(parts[0]) && parts[1] === 'frases' && parts[2]) {
    return { slug: decodeURIComponent(parts[2]) };
  }
  return {};
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const ua = request.headers.get('user-agent') ?? '';
  if (!CRAWLER_UA.test(ua)) return;

  const { slug, id } = parseFrasePath(new URL(request.url).pathname);
  if (!slug && !id) return;

  const apiUrl = new URL('/api/seo/frase', request.url);
  if (slug) apiUrl.searchParams.set('slug', slug);
  if (id) apiUrl.searchParams.set('id', id);

  return fetch(apiUrl.toString(), {
    headers: { Accept: 'text/html' },
  });
}

export const config = {
  matcher: ['/frases/:slug*', '/f/:id*', '/:lang/frases/:slug*'],
};
