/** Hash do texto fonte — invalida cache se frase_original mudar. */
export function hashPhraseSourceText(text: string): string {
  let h = 0;
  const s = text.trim();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
