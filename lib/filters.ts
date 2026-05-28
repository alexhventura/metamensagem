import type { Frase } from './normalizeFrases';

export interface FraseFilters {
  categoria?: string;
  contexto?: string;
  autor?: string;
  search?: string;
}

function normParam(v: string | undefined): string {
  return (v || '').trim().toLowerCase();
}

export function filterFrases(frases: Frase[], filters: FraseFilters): Frase[] {
  let result = frases;

  const categoria = normParam(filters.categoria);
  if (categoria) {
    result = result.filter((f) => f.categoria === categoria);
  }

  const contexto = normParam(filters.contexto);
  if (contexto) {
    result = result.filter((f) => f.contextos.includes(contexto));
  }

  const autor = normParam(filters.autor);
  if (autor) {
    result = result.filter(
      (f) =>
        f.autor_slug === autor ||
        normParam(f.autor_original) === autor ||
        slugifyAutorMatch(f.autor_slug, autor)
    );
  }

  const search = normParam(filters.search);
  if (search) {
    result = result.filter((f) => {
      const blob = [
        f.frase_original,
        f.autor_original,
        f.explicacao,
        f.categoria,
        ...f.contextos,
        ...f.palavras_chave,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(search);
    });
  }

  return result;
}

function slugifyAutorMatch(a: string, b: string): boolean {
  return a.replace(/-/g, '') === b.replace(/-/g, '');
}
