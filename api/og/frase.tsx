import { ImageResponse } from '@vercel/og';
import { requestUrl, type ApiRequest, type ApiResponse } from '../_http.js';

function previewSerialForQuote(quoteId: string): string {
  const year = new Date().getFullYear();
  let hash = 0;
  const str = `${quoteId}-${year}`;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  const seq = (Math.abs(hash) % 99_999_999) + 1;
  return `MMM-${year}-${String(seq).padStart(8, '0')}`;
}

async function resolveOgFrase(
  idOrSlug: string,
  origin: string
): Promise<{ id: string; slug: string; texto: string; autor: string; categoria?: string } | null> {
  const key = decodeURIComponent(idOrSlug).trim();
  if (!key) return null;

  let slug = key;
  if (key.startsWith('f_')) {
    try {
      const idx = await fetch(`${origin}/frases-v2/id-index.json`);
      if (idx.ok) {
        const map = (await idx.json()) as Record<string, string>;
        slug = map[key] || key;
      }
    } catch {
      /* id-index opcional */
    }
  }

  const res = await fetch(`${origin}/api/frase-detail?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) return null;

  const f = (await res.json()) as {
    id: string;
    slug: string;
    frase_original: string;
    autor_original: string;
    categoria?: string;
  };
  const texto = (f.frase_original || '').trim();
  if (!texto) return null;
  return {
    id: f.id,
    slug: f.slug,
    texto,
    autor: (f.autor_original || 'Anônimo').trim(),
    categoria: f.categoria,
  };
}

export const config = {
  runtime: 'edge',
};

export default async function handler(req: ApiRequest): Promise<Response> {
  const url = requestUrl(req);
  const parts = url.pathname.split('/').filter(Boolean);
  const fromPath = parts[parts.length - 1];
  const id = url.searchParams.get('id') || fromPath;

  if (!id || id === 'frase') {
    return new Response('id required', { status: 400 });
  }

  const frase = await resolveOgFrase(id, url.origin);
  if (!frase) {
    return new Response('Frase não encontrada', { status: 404 });
  }

  const serial = previewSerialForQuote(frase.id);
  const author = frase.autor.trim();
  const quotePx = frase.texto.length > 150 ? 36 : frase.texto.length > 80 ? 44 : 52;
  const categoryLabel = (frase.categoria || 'Frase').replace(/-/g, ' ').slice(0, 23);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 48,
          background: 'linear-gradient(145deg, #1a0a2e 0%, #4c1d95 45%, #312e81 100%)',
          color: '#fafafa',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            M
          </div>
          <span style={{ fontSize: 28, fontWeight: 800 }}>Metamensagem</span>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: quotePx,
            fontWeight: 800,
            lineHeight: 1.35,
            padding: '0 8%',
          }}
        >
          “{frase.texto}”
        </div>
        {author ? (
          <p style={{ textAlign: 'center', fontSize: 28, opacity: 0.85, margin: 0 }}>— {author}</p>
        ) : null}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.14)',
            paddingTop: 16,
            textAlign: 'center',
            fontSize: 18,
            opacity: 0.75,
          }}
        >
          <div>metamensagem.com</div>
          <div style={{ fontSize: 15, marginTop: 6 }}>{categoryLabel} ◈ {serial.slice(-20)}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    }
  );
}
