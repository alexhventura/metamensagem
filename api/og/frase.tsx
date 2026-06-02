import { ImageResponse } from '@vercel/og';
import { findFraseForOg, previewSerialForQuote } from '../../lib/server/findFraseForOg';

export const config = {
  runtime: 'nodejs',
};

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
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
  const quote = truncate(frase.texto, 220);
  const autor = truncate(frase.autor, 80);
  const skin = frase.categoria || 'premium';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 56,
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'center' }}>
          <p
            style={{
              fontSize: quote.length > 120 ? 36 : 42,
              fontWeight: 800,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            &ldquo;{quote}&rdquo;
          </p>
          <p style={{ fontSize: 26, opacity: 0.85, margin: 0 }}>— {autor}</p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 18,
            opacity: 0.75,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: 20,
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
