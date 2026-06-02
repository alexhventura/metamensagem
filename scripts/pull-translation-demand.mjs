/**
 * Baixa snapshot de demanda do Vercel Blob → data/translation-queue.json
 * Uso: BLOB_READ_WRITE_TOKEN=... npm run translations:pull-demand
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
const outQueue = join(process.cwd(), 'data', 'translation-queue.json');
const outSnapshot = join(process.cwd(), 'data', 'translation-queue-snapshot.json');

async function main() {
  if (!token) {
    const local = join(process.cwd(), 'data', 'translation-queue-snapshot.json');
    if (existsSync(local)) {
      const snap = JSON.parse(readFileSync(local, 'utf8'));
      writeFileSync(outQueue, JSON.stringify(snap.queue || {}, null, 2));
      console.log('Usando snapshot local (sem BLOB_READ_WRITE_TOKEN)');
      return;
    }
    console.warn('BLOB_READ_WRITE_TOKEN ausente — mantendo translation-queue.json do repo.');
    return;
  }

  const { list } = await import('@vercel/blob');
  const listed = await list({ prefix: 'translation-demand/', token });
  const hit = listed.blobs.find((b) => b.pathname === 'translation-demand/snapshot.json');
  if (!hit?.url) {
    console.warn('Nenhum snapshot no Blob ainda.');
    return;
  }

  const res = await fetch(hit.url);
  if (!res.ok) throw new Error(`Blob fetch HTTP ${res.status}`);
  const snap = await res.json();
  writeFileSync(outSnapshot, JSON.stringify(snap, null, 2));
  writeFileSync(outQueue, JSON.stringify(snap.queue || {}, null, 2));
  console.log('Demanda atualizada:', outQueue, '| frases:', Object.keys(snap.queue || {}).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
