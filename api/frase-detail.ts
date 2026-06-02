/**
 * GET /api/frase-detail?slug=... — uma frase do acervo (sem baixar shard inteiro no cliente).
 */
export const config = {
  runtime: 'nodejs',
};

import {
  fraseDetailCacheHeaders,
  readFraseDetailFromShards,
} from '../lib/frases/detailLookupServer';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const slug = decodeURIComponent(url.searchParams.get('slug') ?? '').toLowerCase().trim();
  if (!slug) {
    return Response.json({ error: 'slug required', found: false }, { status: 400 });
  }

  try {
    const frase = await readFraseDetailFromShards(slug);
    if (!frase) {
      return Response.json({ slug, found: false, message: 'Frase não encontrada' }, { status: 404 });
    }
    return Response.json(frase, { headers: fraseDetailCacheHeaders() });
  } catch {
    return Response.json(
      { slug, found: false, message: 'Frase não encontrada' },
      { status: 404 }
    );
  }
}
