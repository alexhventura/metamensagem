/**
 * POST /api/translation-demand — agrega demanda (sem PII) para fila global.
 * Persistência: Vercel Blob (BLOB_READ_WRITE_TOKEN).
 */
export const config = { runtime: 'edge' };

import {
  mergeDemandSnapshots,
  type TranslationDemandSnapshot,
} from './_translationDemand.js';

const BLOB_PATH = 'translation-demand/snapshot.json';

async function loadFromBlob(token: string): Promise<TranslationDemandSnapshot | null> {
  try {
    const { list } = await import('@vercel/blob');
    const listed = await list({ prefix: 'translation-demand/', token });
    const hit = listed.blobs.find((b) => b.pathname === BLOB_PATH);
    if (!hit?.url) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return (await res.json()) as TranslationDemandSnapshot;
  } catch {
    return null;
  }
}

async function saveToBlob(snapshot: TranslationDemandSnapshot, token: string): Promise<boolean> {
  try {
    const { put } = await import('@vercel/blob');
    await put(BLOB_PATH, JSON.stringify(snapshot), {
      access: 'public',
      addRandomSuffix: false,
      token,
      contentType: 'application/json',
    });
    return true;
  } catch {
    return false;
  }
}

async function loadSnapshot(): Promise<TranslationDemandSnapshot> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const fromBlob = await loadFromBlob(token);
    if (fromBlob) return fromBlob;
  }
  return { queue: {}, meta: {} };
}

async function saveSnapshot(snapshot: TranslationDemandSnapshot): Promise<{ persisted: boolean; via: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const ok = await saveToBlob(snapshot, token);
    if (ok) return { persisted: true, via: 'blob' };
  }
  return { persisted: false, via: 'none' };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    const snapshot = await loadSnapshot();
    return Response.json(
      {
        ok: true,
        updatedAt: snapshot.updatedAt,
        phraseCount: Object.keys(snapshot.queue).length,
        queue: snapshot.queue,
      },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body: Partial<TranslationDemandSnapshot>;
  try {
    body = (await req.json()) as Partial<TranslationDemandSnapshot>;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const incomingQueue = body.queue ?? (body as { counts?: TranslationDemandSnapshot['queue'] }).counts;
  if (!incomingQueue || typeof incomingQueue !== 'object') {
    return Response.json({ error: 'queue required' }, { status: 400 });
  }

  const current = await loadSnapshot();
  const merged = mergeDemandSnapshots(current, {
    queue: incomingQueue,
    meta: body.meta || {},
  });

  const save = await saveSnapshot(merged);

  return Response.json({
    ok: true,
    persisted: save.persisted,
    storage: save.via,
    phraseCount: Object.keys(merged.queue).length,
    updatedAt: merged.updatedAt,
  });
}
