import { ImageResponse } from '@vercel/og';
import { findFraseForOg, previewSerialForQuote } from '../../lib/server/findFraseForOg';
import { computeImageLayout } from '../../src/components/image-generator/utils/textLayout';
import { requestUrl } from '../_shared';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: Request) {
  const url = requestUrl(req);
  const parts = url.pathname.split('/').filter(Boolean);
  const fromPath = parts[parts.length - 1];
  const id = url.searchParams.get('id') || fromPath;

  if (!id || id === 'frase') {
    return new Response('id required', { status: 400 });
  }

  const frase = await findFraseForOg(id);
  if (!frase) {
    return new Response('Frase não encontrada', { status: 404 });
  }

  const serial = previewSerialForQuote(frase.id);
  const layout = computeImageLayout(frase.texto, frase.autor, 1200, 630);
  const skin = frase.categoria || 'premium';
  const author = frase.autor.trim();

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
          paddingBottom: 52,
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
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>Metamensagem</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
            justifyContent: 'center',
            paddingBottom: layout.authorBottomGap,
            maxHeight: layout.safe.quoteHeight,
          }}
        >
          <div
            style={{
              fontSize: layout.quotePx,
              fontWeight: 800,
              lineHeight: layout.lineHeight / layout.quotePx,
              margin: 0,
              textAlign: 'center',
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
          {author ? (
            <p
              style={{
                fontSize: layout.authorPx,
                opacity: 0.85,
                margin: 0,
                textAlign: 'center',
              }}
            >
              — {author}
            </p>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: layout.footerPx,
            opacity: 0.75,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: 16,
          }}
        >
          <span>metamensagem.com · {skin}</span>
          <span>{serial}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
