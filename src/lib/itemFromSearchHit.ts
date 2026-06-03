import type { ItemConteudo } from '../types/content';
import type { FraseSearchHit } from './supabase/fraseSearchLoader';

/** Metadados do índice → card de listagem (sem carregar detalhe). */
export function itemConteudoFromSearchHit(hit: FraseSearchHit): ItemConteudo {
  return {
    id: hit.id,
    tipo: 'frase',
    texto: hit.titulo,
    autor: '',
    tags: [],
    slug: hit.slug,
  };
}
