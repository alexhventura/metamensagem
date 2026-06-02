const STORAGE_PREFIX = 'mm-image-serial-seq';

/** Serial estável para pré-visualização (mesma frase → mesmo preview). */
export function previewSerialForQuote(quoteId: string): string {
  const year = new Date().getFullYear();
  let hash = 0;
  const str = `${quoteId}-${year}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const seq = (Math.abs(hash) % 99_999_999) + 1;
  return formatImageSerial(year, seq);
}

/** Aloca serial único por exportação (MMM-ANO-00000001). */
export function allocateImageSerial(): string {
  const year = new Date().getFullYear();
  const key = `${STORAGE_PREFIX}-${year}`;
  let seq = 1;
  if (typeof localStorage !== 'undefined') {
    const prev = parseInt(localStorage.getItem(key) || '0', 10);
    seq = Number.isFinite(prev) ? prev + 1 : 1;
    localStorage.setItem(key, String(seq));
  } else {
    seq = Math.floor(Date.now() % 99_999_999) + 1;
  }
  return formatImageSerial(year, seq);
}

export function formatImageSerial(year: number, sequence: number): string {
  return `MMM-${year}-${String(sequence).padStart(8, '0')}`;
}

/** @deprecated Use previewSerialForQuote / allocateImageSerial */
export function generateCardSerial(frase: string, autor: string): string {
  return previewSerialForQuote(`${frase}-${autor}`);
}
