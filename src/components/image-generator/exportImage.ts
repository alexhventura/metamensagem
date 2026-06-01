/** Exportação client-side (html-to-image — carregado sob demanda). */

import { ensureImageExportFonts } from './utils/imageFonts';

export type CaptureFontSample = { text: string; autor: string };

export async function captureElementAsBlob(
  node: HTMLElement,
  mime: 'image/png' | 'image/jpeg',
  fontSample?: CaptureFontSample
): Promise<Blob> {
  if (fontSample) {
    await ensureImageExportFonts(fontSample.text, fontSample.autor);
  }
  const { toBlob } = await import('html-to-image');
  const blob = await toBlob(node, {
    pixelRatio: 2,
    cacheBust: true,
    type: mime,
    quality: mime === 'image/jpeg' ? 0.92 : undefined,
  });
  if (!blob) throw new Error('Falha ao gerar imagem');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
