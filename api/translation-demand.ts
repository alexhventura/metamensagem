/**
 * POST /api/translation-demand — agrega demanda (sem PII) para fila global.
 */
import {
  mergeDemandSnapshots,
  type TranslationDemandSnapshot,
} from './_translationDemand.js';
import { sendJson, type ApiResponse } from './_http.js';
import type { ApiRequest } from './_shared.js';

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

async function readJsonBody(req: ApiRequest): Promise<unknown> {
  if (req.body != null && typeof req.body === 'object') return req.body;
  if (req.body != null && typeof req.body === 'string') return JSON.parse(req.body);
  if (!req.on) return {};
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on!('data', (c) => chunks.push(c));
    req.on!('end', () => resolve());
    req.on!('error', reject);
  });
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method === 'GET') {
    const snapshot = await loadSnapshot();
    sendJson(
      res,
      200,
      {
        ok: true,
        updatedAt: snapshot.updatedAt,
        phraseCount: Object.keys(snapshot.queue).length,
        queue: snapshot.queue,
      },
      { 'Cache-Control': 'private, max-age=60' }
    );
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let body: Partial<TranslationDemandSnapshot>;
  try {
    body = (await readJsonBody(req)) as Partial<TranslationDemandSnapshot>;
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON' });
    return;
  }

  const incomingQueue = body.queue ?? (body as { counts?: TranslationDemandSnapshot['queue'] }).counts;
  if (!incomingQueue || typeof incomingQueue !== 'object') {
    sendJson(res, 400, { error: 'queue required' });
    return;
  }

  const current = await loadSnapshot();
  const merged = mergeDemandSnapshots(current, {
    queue: incomingQueue,
    meta: body.meta || {},
  });

  const save = await saveSnapshot(merged);

  sendJson(res, 200, {
    ok: true,
    persisted: save.persisted,
    storage: save.via,
    phraseCount: Object.keys(merged.queue).length,
    updatedAt: merged.updatedAt,
  });
}
