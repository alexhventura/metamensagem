/**
 * Proxy MyMemory no servidor — cota separada do IP do visitante + MYMEMORY_EMAIL no Vercel.
 */
import { requestUrl } from './_shared';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = requestUrl(req);
  const q = url.searchParams.get('q');
  const langpair = url.searchParams.get('langpair');
  if (!q?.trim() || !langpair?.trim()) {
    return Response.json({ error: 'q and langpair are required' }, { status: 400 });
  }

  let upstreamUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(langpair)}`;
  const email = process.env.MYMEMORY_EMAIL?.trim();
  if (email) upstreamUrl += `&de=${encodeURIComponent(email)}`;

  try {
    const upstream = await fetch(upstreamUrl);
    const body = await upstream.text();

    if (!upstream.ok) {
      return Response.json(
        { unavailable: true, responseStatus: upstream.status },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        }
      );
    }

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return Response.json(
      { unavailable: true, responseStatus: 503 },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  }
}
