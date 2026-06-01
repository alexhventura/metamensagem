export type {
  CardLang,
  CardContentDisplay,
  CardContentSource,
  LanguageDetection,
  TranslateContentOptions,
  TranslateOptions,
} from './types';
export { TranslationFailedError } from './types';
export { CARD_LANG_OPTIONS, CARD_LANG_SUCCESS_LABEL, ALL_CARD_LANGS } from './cardLanguages';
export {
  detectCardLanguage,
  detectCardLanguageWithConfidence,
  detectLanguage,
  textAppearsToBeLanguage,
} from './detect';
export { shouldTranslateAuthor, resolveTranslatedAuthor } from './authorPolicy';

export async function translateCardText(
  text: string,
  target: import('./types').CardLang,
  sourceLang?: import('./types').CardLang,
  options?: import('./types').TranslateOptions
): Promise<string> {
  const m = await import('./translationEngine');
  return m.translateCardText(text, target, sourceLang, options);
}

export async function translateCardContent(
  source: import('./types').CardContentSource,
  target: import('./types').CardLang,
  options?: import('./types').TranslateContentOptions
): Promise<import('./types').CardContentDisplay> {
  const m = await import('./translationEngine');
  return m.translateCardContent(source, target, options);
}

export async function pruneInvalidTranslationCache(): Promise<void> {
  const m = await import('./translationEngine');
  m.pruneInvalidTranslationCache();
}
