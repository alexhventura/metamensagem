/**
 * Fachada de tradução de conteúdo (card/detalhe).
 * O motor MyMemory é carregado apenas sob demanda via import dinâmico.
 */
export type {
  CardLang,
  CardContentDisplay,
  CardContentSource,
  LanguageDetection,
  TranslateContentOptions,
  TranslateOptions,
} from './translation/types';

export {
  TranslationFailedError,
  CARD_LANG_OPTIONS,
  CARD_LANG_SUCCESS_LABEL,
  detectCardLanguage,
  detectCardLanguageWithConfidence,
  detectLanguage,
  textAppearsToBeLanguage,
  shouldTranslateAuthor,
  resolveTranslatedAuthor,
  translateCardText,
  translateCardContent,
  pruneInvalidTranslationCache,
} from './translation/index';

export { sanitizeTextForTranslation, stripOuterQuotes } from './textSanitize';

