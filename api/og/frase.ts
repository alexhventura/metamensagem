/**
 * GET /api/og/frase?id=... — imagem OG 1200×630 (SVG, sem @vercel/og).
 */
import { requestUrl, sendText, type ApiResponse } from '../_http.js';
import type { ApiRequest } from '../_shared.js';

function previewSerialForQuote(quoteId: string): string {
  const year = new Date().getFullYear();
  let hash = 0;
  const str = `${quoteId}-${year}`;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  const seq = (Math.abs(hash) % 99_999_999) + 1;
  return `MMM-${year}-${String(seq).padStart(8, '0')}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > maxChars - 1 ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
  }
  return lines.length ? lines : [text.slice(0, maxChars)];
}

function buildOgSvg(input: {
  quote: string;
  author: string;
  categoryLabel: string;
  serialTail: string;
}): string {
  const fontSize = input.quote.length > 150 ? 36 : input.quote.length > 80 ? 44 : 52;
  const lines = wrapLines(input.quote, 42, 6);
  const lineHeight = Math.round(fontSize * 1.35);
  const blockHeight = lines.length * lineHeight;
  const startY = 320 - blockHeight / 2 + fontSize;

  const quoteTspans = lines
    .map((line, i) => {
      const dy = i === 0 ? 0 : lineHeight;
      return `<tspan x="600" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  const authorBlock = input.author
    ? `<text x="600" y="520" text-anchor="middle" fill="#fafafa" fill-opacity="0.85" font-family="system-ui,sans-serif" font-size="28">— ${escapeXml(input.author)}</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a0a2e"/>
      <stop offset="45%" stop-color="#4c1d95"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="48" y="48" width="48" height="48" rx="12" fill="#ffffff" fill-opacity="0.15"/>
  <text x="72" y="80" text-anchor="middle" fill="#fafafa" font-family="system-ui,sans-serif" font-size="22" font-weight="900">M</text>
  <text x="112" y="82" fill="#fafafa" font-family="system-ui,sans-serif" font-size="28" font-weight="800">Metamensagem</text>
  <text x="600" y="${startY}" text-anchor="middle" fill="#fafafa" font-family="system-ui,sans-serif" font-size="${fontSize}" font-weight="800"><tspan x="600">“</tspan>${quoteTspans}<tspan x="600" dy="${lineHeight}">”</tspan></text>
  ${authorBlock}
  <line x1="120" y1="560" x2="1080" y2="560" stroke="#ffffff" stroke-opacity="0.14"/>
  <text x="600" y="592" text-anchor="middle" fill="#fafafa" fill-opacity="0.75" font-family="system-ui,sans-serif" font-size="18">metamensagem.com</text>
  <text x="600" y="618" text-anchor="middle" fill="#fafafa" fill-opacity="0.75" font-family="system-ui,sans-serif" font-size="15">${escapeXml(input.categoryLabel)} ◈ ${escapeXml(input.serialTail)}</text>
</svg>`;
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
      const idx = await fetch(`${origin.replace(/\/$/, '')}/frases-v2/id-index.json`);
      if (idx.ok) {
        const map = (await idx.json()) as Record<string, string>;
        slug = map[key] || key;
      }
    } catch {
      /* id-index opcional */
    }
  }

  const res = await fetch(`${origin.replace(/\/$/, '')}/api/frase-detail?slug=${encodeURIComponent(slug)}`);
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

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendText(res, 405, 'Method not allowed');
    return;
  }

  const url = requestUrl(req);
  const parts = url.pathname.split('/').filter(Boolean);
  const fromPath = parts[parts.length - 1];
  const id =
    url.searchParams.get('id') ||
    url.searchParams.get('slug') ||
    (fromPath !== 'frase' ? fromPath : null);

  if (!id || id === 'frase') {
    sendText(res, 400, 'id required');
    return;
  }

  const frase = await resolveOgFrase(id, url.origin);
  if (!frase) {
    sendText(res, 404, 'Frase não encontrada');
    return;
  }

  const serial = previewSerialForQuote(frase.id);
  const categoryLabel = (frase.categoria || 'Frase').replace(/-/g, ' ').slice(0, 23);
  const svg = buildOgSvg({
    quote: frase.texto,
    author: frase.autor,
    categoryLabel,
    serialTail: serial.slice(-20),
  });

  sendText(res, 200, svg, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
  });
}
