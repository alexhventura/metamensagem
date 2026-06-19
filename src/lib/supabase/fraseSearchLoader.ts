/**
 * Busca de frases — delega ao índice estático CDN (467k shards).
 * Mantém este módulo como ponto de importação estável para hooks e frasesModel.
 */

export {
  FRASE_SEARCH_SELECT,
  searchFrasesIndex,
  searchFrasesIndexByCategoria,
  searchFrasesIndexByTags,
  searchFrasesIndexByText,
  tituloFromSlug,
  type FraseSearchHit,
  type FraseSearchOptions,
} from '../staticFraseSearch';
