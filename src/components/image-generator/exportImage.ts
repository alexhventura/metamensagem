/** Exportação client-side + download com gesto do usuário preservado quando possível. */

import { ensureCaptureFontsReady } from './utils/imageFonts';
import { assertQuoteBlockFits } from './utils/measureQuoteBlock';
import {
  assertExportTextIntegrity,
  assertLayoutReady,
  computeImageLayout,
} from './utils/textLayout';

export type CaptureFontSample = { text: string; autor: string };

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

export type FileSaveHandle = FileSystemFileHandle;

/** Chamar no clique do usuário (antes de awaits longos) para preservar o gesto. */
export async function requestFileSaveHandle(
  filename: string,
  mime: 'image/png' | 'image/jpeg'
): Promise<FileSaveHandle | null> {
  const picker = (window as Window & { showSaveFilePicker?: typeof showSaveFilePicker })
    .showSaveFilePicker;
  if (typeof picker !== 'function') {
    exportDebug('save-picker-unavailable');
    return null;
  }

  const ext = mime === 'image/png' ? '.png' : '.jpg';
  try {
    const handle = await picker({
      suggestedName: filename.endsWith(ext) ? filename : `${filename}${ext}`,
      types: [
        {
          description: mime === 'image/png' ? 'PNG' : 'JPEG',
          accept: { [mime]: [ext] },
        },
      ],
    });
    exportDebug('save-picker-granted', { filename });
    return handle;
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    if (name === 'AbortError') {
      exportDebug('save-picker-aborted');
      throw e;
    }
    exportDebug('save-picker-failed', { name });
    return null;
  }
}

export async function writeBlobToFileHandle(
  handle: FileSaveHandle,
  blob: Blob
): Promise<void> {
  exportDebug('write-handle-start', { size: blob.size, type: blob.type });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  exportDebug('write-handle-done');
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
  assertQuoteBlockFits(node);
  assertExportTextIntegrity(node, text);

  const { domToBlob } = await import('modern-screenshot');
  exportDebug('dom-to-blob');
  const blob = await domToBlob(node, {
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
  });

  if (!blob || blob.size < 64) {
    exportDebug('blob-invalid', { size: blob?.size });
    throw new Error('Falha ao gerar imagem');
  }
  exportDebug('capture-done', { size: blob.size, type: blob.type });
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
 * Salva blob no disco: File System Access API (gesto preservado) ou âncora download.
 */
export async function saveBlobToDisk(
  blob: Blob,
  filename: string,
  fileHandle?: FileSaveHandle | null
): Promise<void> {
  if (fileHandle) {
    await writeBlobToFileHandle(fileHandle, blob);
    return;
  }
  downloadBlob(blob, filename);
}

/**
 * Dispara download no disco do usuário (fallback quando não há File System Access).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  exportDebug('download-anchor-start', { filename, size: blob.size, type: blob.type });

  const nav = window.navigator as Navigator & {
    msSaveOrOpenBlob?: (b: Blob, name: string) => boolean;
  };

  if (typeof nav.msSaveOrOpenBlob === 'function') {
    const ok = nav.msSaveOrOpenBlob(blob, filename);
    exportDebug('download-msSaveOrOpenBlob', { ok });
    return;
  }

  const url = URL.createObjectURL(blob);
  exportDebug('download-object-url', { urlPrefix: url.slice(0, 32) });

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.setAttribute('download', filename);
  a.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;';
  document.body.appendChild(a);

  try {
    a.click();
    exportDebug('download-anchor-clicked');
  } catch {
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    a.dispatchEvent(ev);
    exportDebug('download-anchor-dispatched');
  }

  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
    exportDebug('download-object-url-revoked');
  }, 60_000);
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
