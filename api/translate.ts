/**
 * Proxy MyMemory no servidor — cota separada do IP do visitante + MYMEMORY_EMAIL no Vercel.
 */
import { requestUrl, sendJson, sendText, type ApiResponse } from './_http.js';
import type { ApiRequest } from './_shared.js';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const url = requestUrl(req);
  const q = url.searchParams.get('q');
  const langpair = url.searchParams.get('langpair');
  if (!q?.trim() || !langpair?.trim()) {
    sendJson(res, 400, { error: 'q and langpair are required' });
    return;
  }

  let upstreamUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(langpair)}`;
  const email = process.env.MYMEMORY_EMAIL?.trim();
  if (email) upstreamUrl += `&de=${encodeURIComponent(email)}`;

  try {
    const upstream = await fetch(upstreamUrl);
    const body = await upstream.text();

    if (!upstream.ok) {
      sendJson(
        res,
        200,
        { unavailable: true, responseStatus: upstream.status },
        { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
      );
      return;
    }

    sendText(res, 200, body, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    });
  } catch {
    sendJson(
      res,
      200,
      { unavailable: true, responseStatus: 503 },
      { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    );
  }
}
