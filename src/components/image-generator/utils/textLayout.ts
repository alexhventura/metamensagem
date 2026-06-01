/** Quebra frase em linhas para cartão (sem canvas). */
export function wrapQuote(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [''];

  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word.length > maxCharsPerLine ? word.slice(0, maxCharsPerLine - 1) + '…' : word;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.endsWith('…') ? last : `${last.replace(/[.,;:!?]$/, '')}…`;
  }

  return lines.length ? lines : [clean.slice(0, maxCharsPerLine)];
}

export function quoteFontSize(charCount: number, formatHeight: number): number {
  const base = formatHeight * 0.052;
  if (charCount < 60) return Math.min(base * 1.15, 72);
  if (charCount < 120) return base;
  if (charCount < 200) return base * 0.88;
  return base * 0.72;
}
