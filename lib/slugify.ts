/** Gera slug URL-safe (PT-BR, sem acentos). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 120);
}

export function slugifyAutor(nome: string): string {
  return slugify(nome || 'anonimo');
}
