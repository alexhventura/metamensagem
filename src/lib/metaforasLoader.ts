import { safeText } from './safeContent';

/**
 * Camada de dados de metáforas — preparada para migração entre:
 * - monólito: /metaforas.json
 * - fragmentos: /metaforas/{id}.json + /metaforas-index.json
 */

export interface MetaforaItem {
  id: string;
  tipo: 'metafora';
  titulo: string;
  texto: string;
  autor: string;
  tags: string[];
  resumo: string;
  imagem?: string;
}

export const METAFORAS_URLS = {
  index: '/metaforas-index.json',
  bulk: '/metaforas.json',
  fragment: (id: string) => `/metaforas/${sanitizarIdMetafora(id)}.json`,
} as const;

export function sanitizarIdMetafora(id: unknown): string {
  return safeText(id).toLowerCase().replace(/[^a-z0-9_\-]/g, '').substring(0, 50);
}

export function filtrarMetaforasDoBanco<T extends { tipo?: string }>(
  banco: T[]
): T[] {
  return banco.filter((i) => i.tipo === 'metafora');
}

export function encontrarMetaforaNoBanco<T extends { id: string; tipo?: string }>(
  banco: T[],
  id: string
): T | undefined {
  const idNorm = sanitizarIdMetafora(id);
  return filtrarMetaforasDoBanco(banco).find(
    (m) => sanitizarIdMetafora(m.id) === idNorm
  );
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Carrega metáfora completa: fragmento → fallback monólito. */
export async function carregarMetaforaDetalhe(
  id: string
): Promise<MetaforaItem | null> {
  const idNorm = sanitizarIdMetafora(id);
  if (!idNorm) return null;

  const fragmento = await fetchJson<MetaforaItem>(
    METAFORAS_URLS.fragment(idNorm)
  );
  if (fragmento?.texto) {
    return { ...fragmento, tipo: 'metafora', id: idNorm };
  }

  const todas = await fetchJson<MetaforaItem[]>(METAFORAS_URLS.bulk);
  const encontrada = todas?.find(
    (m) => sanitizarIdMetafora(m.id) === idNorm
  );
  if (encontrada?.texto) {
    return { ...encontrada, tipo: 'metafora', id: idNorm };
  }

  return null;
}

/** Índice leve para listagem (quando banco global ainda não carregou). */
export async function carregarIndiceMetaforas(): Promise<
  Pick<MetaforaItem, 'id' | 'tipo' | 'titulo' | 'autor' | 'tags' | 'resumo'>[]
> {
  const index = await fetchJson<
    Pick<MetaforaItem, 'id' | 'tipo' | 'titulo' | 'autor' | 'tags' | 'resumo'>[]
  >(METAFORAS_URLS.index);
  return index ?? [];
}
