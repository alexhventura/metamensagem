/** Exportação client-side + download com gesto do usuário preservado quando possível. */

import { ensureCaptureFontsReady } from './utils/imageFonts';
import { assertQuoteBlockFits } from './utils/measureQuoteBlock';
import {
  assertExportTextIntegrity,
  assertLayoutReady,
  computeImageLayout,
} from './utils/textLayout';

export type CaptureFontSample = { text: string; autor: string };

export async function captureElementAsBlob(
  node: HTMLElement,
  mime: 'image/png' | 'image/jpeg',
  fontSample?: CaptureFontSample
): Promise<Blob> {
  const { text, autor } = fontSample ?? { text: '', autor: '' };
  const w = node.offsetWidth || Number(node.getAttribute('data-mm-width')) || 1080;
  const h = node.offsetHeight || Number(node.getAttribute('data-mm-height')) || 1080;

  const plan = computeImageLayout(text, autor, w, h);
  assertLayoutReady(plan);
  await ensureCaptureFontsReady(text, autor);

  await waitForLayoutStable(node);
  assertQuoteBlockFits(node);
  assertExportTextIntegrity(node, text);

  const { domToBlob } = await import('modern-screenshot');
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
    throw new Error('Falha ao gerar imagem');
  }
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
 * Dispara download no disco do usuário.
 * Usa msSaveOrOpenBlob (legacy) ou âncora com download + clique sintético.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const nav = window.navigator as Navigator & {
    msSaveOrOpenBlob?: (b: Blob, name: string) => boolean;
  };

  if (typeof nav.msSaveOrOpenBlob === 'function') {
    nav.msSaveOrOpenBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.setAttribute('download', filename);
  a.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
  document.body.appendChild(a);

  try {
    a.click();
  } catch {
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    a.dispatchEvent(ev);
  }

  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
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
