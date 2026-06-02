/** Exportação client-side + download (modern-screenshot → Blob → âncora / file-saver). */

import { saveAs } from 'file-saver';
import { ensureCaptureFontsReady } from './utils/imageFonts';
import { assertQuoteBlockFits } from './utils/measureQuoteBlock';
import {
  assertExportTextIntegrity,
  assertLayoutReady,
  computeImageLayout,
} from './utils/textLayout';

export type CaptureFontSample = { text: string; autor: string };

export type FileSaveHandle = FileSystemFileHandle;

/** Fallback quando o gesto do usuário expirou após captura assíncrona (Chrome). */
export async function requestFileSaveHandle(
  filename: string,
  mime: 'image/png' | 'image/jpeg'
): Promise<FileSaveHandle | null> {
  const picker = (window as Window & { showSaveFilePicker?: typeof showSaveFilePicker })
    .showSaveFilePicker;
  if (typeof picker !== 'function') return null;
  const ext = mime === 'image/png' ? '.png' : '.jpg';
  try {
    return await picker({
      suggestedName: filename.endsWith(ext) ? filename : `${filename}${ext}`,
      types: [{ description: mime === 'image/png' ? 'PNG' : 'JPEG', accept: { [mime]: [ext] } }],
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    return null;
  }
}

export async function writeBlobToFileHandle(handle: FileSaveHandle, blob: Blob): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

const DEBUG_KEY = 'mm-export-debug';

export function isExportDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DEBUG_KEY) === '1' || import.meta.env.DEV;
  } catch {
    return import.meta.env.DEV;
  }
}

export function exportDebug(step: string, detail?: Record<string, unknown>): void {
  if (!isExportDebugEnabled()) return;
  console.info('[mm-export]', step, detail ?? '');
}

export async function captureElementAsBlob(
  node: HTMLElement,
  mime: 'image/png' | 'image/jpeg',
  fontSample?: CaptureFontSample
): Promise<Blob> {
  const { text, autor } = fontSample ?? { text: '', autor: '' };
  const w = node.offsetWidth || Number(node.getAttribute('data-mm-width')) || 1080;
  const h = node.offsetHeight || Number(node.getAttribute('data-mm-height')) || 1080;

  exportDebug('capture-start', { mime, w, h });

  const plan = computeImageLayout(text, autor, w, h);
  assertLayoutReady(plan);
  await ensureCaptureFontsReady(text, autor);

  await waitForLayoutStable(node);
  if (node.getAttribute('data-mm-quote-fits') === '0') {
    assertQuoteBlockFits(node);
  }
  assertExportTextIntegrity(node, text);

  const blob = await renderNodeToBlob(node, mime);
  if (!blob || blob.size < 64) {
    exportDebug('blob-invalid', { size: blob?.size });
    throw new Error('Falha ao gerar imagem');
  }
  exportDebug('capture-done', { size: blob.size, type: blob.type });

  if (typeof window !== 'undefined') {
    (window as Window & { __mmLastExport?: { size: number; type: string; at: number } }).__mmLastExport =
      { size: blob.size, type: blob.type, at: Date.now() };
  }

  return blob;
}

const CAPTURE_TIMEOUT_MS = 45_000;

async function renderNodeToBlob(
  node: HTMLElement,
  mime: 'image/png' | 'image/jpeg'
): Promise<Blob> {
  const withTimeout = <T>(p: Promise<T>, label: string): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) =>
        window.setTimeout(
          () => reject(new Error(`Tempo esgotado ao gerar ${label}`)),
          CAPTURE_TIMEOUT_MS
        )
      ),
    ]);

  const { toBlob } = await import('html-to-image');
  try {
    exportDebug('dom-to-blob-html-to-image');
    const blob = await withTimeout(
      toBlob(node, {
        cacheBust: true,
        pixelRatio: 2,
        type: mime,
        quality: mime === 'image/jpeg' ? 0.92 : undefined,
        skipFonts: true,
      }),
      'PNG/JPG (html-to-image)'
    );
    if (blob && blob.size >= 64) return blob;
  } catch (e) {
    exportDebug('html-to-image-failed', {
      message: e instanceof Error ? e.message : String(e),
    });
  }

  const { domToBlob } = await import('modern-screenshot');
  exportDebug('dom-to-blob-modern-screenshot');
  const blob = await withTimeout(
    domToBlob(node, {
      scale: 2,
      type: mime,
      quality: mime === 'image/jpeg' ? 0.92 : undefined,
      filter: (el) => {
        if (el instanceof HTMLLinkElement && el.rel === 'stylesheet') {
          const href = el.href || '';
          if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
            return false;
          }
        }
        return true;
      },
    }),
    'PNG/JPG (modern-screenshot)'
  );
  if (!blob) throw new Error('Falha ao rasterizar imagem');
  return blob;
}

async function waitForLayoutStable(node: HTMLElement): Promise<void> {
  if ('fonts' in document) {
    await document.fonts.ready;
  }
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  void node.offsetHeight;
}

/**
 * Download: Blob → object URL → âncora → clique → remover → revogar (+ file-saver / iframe).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  exportDebug('download-start', { filename, size: blob.size, type: blob.type });

  const safeName = filename.replace(/[^\w.\-]+/g, '_');
  const typedBlob =
    blob.type === '' ? new Blob([blob], { type: guessMimeFromFilename(safeName) }) : blob;

  const nav = window.navigator as Navigator & {
    msSaveOrOpenBlob?: (b: Blob, name: string) => boolean;
  };
  if (typeof nav.msSaveOrOpenBlob === 'function') {
    const ok = nav.msSaveOrOpenBlob(typedBlob, safeName);
    exportDebug('download-msSaveOrOpenBlob', { ok });
    if (ok) return;
  }

  try {
    saveAs(typedBlob, safeName);
    exportDebug('download-file-saver');
    return;
  } catch (err) {
    exportDebug('download-file-saver-failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const url = URL.createObjectURL(typedBlob);
  exportDebug('download-object-url-created');

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  anchor.rel = 'noopener';
  anchor.setAttribute('download', safeName);
  document.body.appendChild(anchor);

  try {
    anchor.click();
    exportDebug('download-anchor-clicked');
  } catch (err) {
    exportDebug('download-anchor-click-failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    anchor.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    );
  }

  document.body.removeChild(anchor);

  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) {
      const inner = doc.createElement('a');
      inner.href = url;
      inner.download = safeName;
      doc.body.appendChild(inner);
      inner.click();
      exportDebug('download-iframe-anchor-clicked');
    }
    window.setTimeout(() => iframe.remove(), 2000);
  } catch (err) {
    exportDebug('download-iframe-failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    exportDebug('download-object-url-revoked');
  }, 60_000);
}

function guessMimeFromFilename(filename: string): string {
  if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  return 'image/png';
}

export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false;
  const type = blob.type || 'image/png';
  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
  return true;
}

export async function shareImageFile(
  blob: Blob,
  { title, text }: { title: string; text?: string }
): Promise<boolean> {
  if (!navigator.share) return false;
  const file = new File([blob], 'metamensagem-frase.png', { type: blob.type || 'image/png' });
  const payload: ShareData = { title, files: [file] };
  if (text) payload.text = text;

  if (typeof navigator.canShare === 'function' && !navigator.canShare(payload)) {
    return false;
  }

  try {
    await navigator.share(payload);
    return true;
  } catch (e) {
    if ((e as Error).name === 'AbortError') return true;
    return false;
  }
}

export async function shareBlob(blob: Blob, title: string, text: string): Promise<boolean> {
  return shareImageFile(blob, { title, text });
}
