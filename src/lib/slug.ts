/** Alinhado ao pipeline de migração (prepare-data / fraseTransformer). */
export const FRASE_SLUG_TEXT_MAX = 80;

export function normalizarParaSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/** Slug canônico de frase no acervo (primeiros 80 caracteres do texto). */
export function slugifyFraseTexto(texto: string): string {
  const slice = texto.trim().slice(0, FRASE_SLUG_TEXT_MAX);
  return normalizarParaSlug(slice) || 'frase';
}

/** Slug para links compartilhados — nunca gera URL maior que o armazenado. */
export function fraseSlugForUrl(storedSlug: string | undefined, texto: string, id: string): string {
  const fromStore = storedSlug?.trim().toLowerCase();
  if (fromStore) return fromStore;
  return slugifyFraseTexto(texto) || id.toLowerCase();
}
