import { ImageResponse } from '@vercel/og';
import { computeImageLayout, truncateFooterLabel } from '../../src/components/image-generator/utils/textLayout';
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
  runtime: 'nodejs',
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const url = requestUrl(req);
  const parts = url.pathname.split('/').filter(Boolean);
  const fromPath = parts[parts.length - 1];
  const id = url.searchParams.get('id') || fromPath;

  if (!id || id === 'frase') {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('id required');
    return;
  }

  const frase = await resolveOgFrase(id, url.origin);
  if (!frase) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Frase não encontrada');
    return;
  }

  const serial = previewSerialForQuote(frase.id);
  const layout = computeImageLayout(frase.texto, frase.autor, 1200, 630);
  const skin = frase.categoria || 'premium';
  const author = frase.autor.trim();
  const serialDisplay = truncateFooterLabel(serial, 22);

  const { zones } = layout;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          background: 'linear-gradient(145deg, #1a0a2e 0%, #4c1d95 45%, #312e81 100%)',
          color: '#fafafa',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: zones.headerHeight,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: layout.padTop,
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
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>Metamensagem</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: zones.quoteZoneTop,
            left: zones.padX,
            right: zones.padX,
            height: zones.quoteZoneHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: layout.quotePx,
              fontWeight: 800,
              lineHeight: `${layout.lineHeight}px`,
              margin: 0,
            }}
          >
            {layout.lines.map((line, i) => (
              <div key={i} style={{ display: 'block' }}>
                {i === 0 ? '“' : ''}
                {line}
                {i === layout.lines.length - 1 ? '”' : ''}
              </div>
            ))}
          </div>
        </div>

        {author ? (
          <div
            style={{
              position: 'absolute',
              top: zones.authorZoneTop,
              left: zones.padX,
              right: zones.padX,
              height: zones.authorZoneHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <p
              style={{
                fontSize: layout.authorPx,
                opacity: 0.85,
                margin: 0,
                textAlign: 'center',
                maxWidth: '70%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              — {author}
            </p>
          </div>
        ) : null}

        <div
          style={{
            position: 'absolute',
            top: zones.footerTop,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            maxWidth: '80%',
            height: zones.footerHeight,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: layout.footerPx,
            fontWeight: 500,
            lineHeight: 1.2,
            opacity: 0.55,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: layout.padBottom,
            overflow: 'hidden',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
            metamensagem.com · {skin}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }}>
            {serialDisplay}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  const buffer = Buffer.from(await image.arrayBuffer());
  const contentType = image.headers.get('content-type') || 'image/png';
  res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
  res.end(buffer);
}
