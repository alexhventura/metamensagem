/** Idiomas do botão Traduzir (alinhados ao SEO Fase 6). */
export type CardLang = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'hi';

export interface LanguageDetection {
  lang: CardLang;
  confidence: number;
}

export interface CardContentSource {
  texto: string;
  titulo?: string;
  resumo?: string;
  autor?: string;
  explicacao?: string;
}

export interface CardContentDisplay extends CardContentSource {
  isTranslated: boolean;
  translationFailed?: boolean;
  targetLang?: CardLang;
}

export interface TranslateOptions {
  contentId?: string;
  sourceLang?: CardLang;
  force?: boolean;
  skipCache?: boolean;
}

export interface TranslateContentOptions {
  contentId?: string;
  force?: boolean;
  skipCache?: boolean;
}

export class TranslationFailedError extends Error {
  constructor(
    message: string,
    public readonly target: CardLang
  ) {
    super(message);
    this.name = 'TranslationFailedError';
  }
}
