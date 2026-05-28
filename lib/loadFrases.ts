import { cache } from 'react';
import { loadJson } from './loadJson';
import { filterFrases, type FraseFilters } from './filters';
import { normalizeFrases, type Frase, type FraseRaw } from './normalizeFrases';

export interface CategoriaMeta {
  slug: string;
  nome: string;
  descricao: string;
  count: number;
}

export interface ContextoMeta {
  slug: string;
  nome: string;
  descricao: string;
  count: number;
}

export interface AutorMeta {
  slug: string;
  nome: string;
  count: number;
}

const getAllFrasesUncached = (): Frase[] => {
  const raw = loadJson<FraseRaw[]>('frases', 'frases');
  return normalizeFrases(raw);
};

/** Cache por request/build (React cache + leitura única de JSON). */
export const getAllFrases = cache(getAllFrasesUncached);

export function getFraseBySlug(slug: string): Frase | undefined {
  const normalized = slug.trim().toLowerCase();
  return getAllFrases().find((f) => f.slug === normalized);
}

export function getFrasesFiltered(filters: FraseFilters = {}): Frase[] {
  return filterFrases(getAllFrases(), filters);
}

export const getCategorias = cache((): CategoriaMeta[] =>
  loadJson<CategoriaMeta[]>('categorias', 'categorias')
);

export const getContextos = cache((): ContextoMeta[] =>
  loadJson<ContextoMeta[]>('contextos', 'contextos')
);

export const getAutores = cache((): AutorMeta[] =>
  loadJson<AutorMeta[]>('autores', 'autores')
);

export function getCategoriaMeta(slug: string): CategoriaMeta | undefined {
  return getCategorias().find((c) => c.slug === slug.toLowerCase());
}

export function getContextoMeta(slug: string): ContextoMeta | undefined {
  return getContextos().find((c) => c.slug === slug.toLowerCase());
}

export function getAutorMeta(slug: string): AutorMeta | undefined {
  return getAutores().find((a) => a.slug === slug.toLowerCase());
}

export type { Frase, FraseFilters };
