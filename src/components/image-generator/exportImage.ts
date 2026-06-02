/** Exportação client-side (modern-screenshot — sem leitura de cssRules cross-origin). */

import { ensureCaptureFontsReady } from './utils/imageFonts';
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
  const w = node.offsetWidth || parseInt(node.style.width || '1080', 10);
  const h = node.offsetHeight || parseInt(node.style.height || '1080', 10);
  const plan = computeImageLayout(text, autor, w, h);
  assertLayoutReady(plan);
  await ensureCaptureFontsReady(text, autor);
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

  if (!blob) throw new Error('Falha ao gerar imagem');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 200);
}

export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false;
  const type = blob.type || 'image/png';
  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
  return true;
}

/** Compartilha arquivo de imagem (Instagram, WhatsApp, etc.) via Web Share API. */
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

/** @deprecated Use shareImageFile */
export async function shareBlob(blob: Blob, title: string, text: string): Promise<boolean> {
  return shareImageFile(blob, { title, text });
}
