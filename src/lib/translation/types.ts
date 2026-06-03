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
  /** Tradução oficial indisponível; API em contingência — ver aviso amigável. */
  translationContingency?: boolean;
  /** Tradução enfileirada em translation_requests. */
  translationPending?: boolean;
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
  /** Idioma do texto original (ex.: locale da página /en). Evita detecção errada. */
  sourceLang?: CardLang;
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

/** API indisponível; use tradução persistida ou aviso de contingência. */
export class TranslationContingencyError extends Error {
  constructor(
    message: string,
    public readonly target: CardLang,
    public readonly hadOfficialTranslation: boolean
  ) {
    super(message);
    this.name = 'TranslationContingencyError';
  }
}

/** Tradução enfileirada em translation_requests — será processada pelo cron. */
export class TranslationPendingError extends Error {
  constructor(
    message = 'Esta tradução foi solicitada e será processada automaticamente.',
    public readonly target?: CardLang
  ) {
    super(message);
    this.name = 'TranslationPendingError';
  }
}

export type PhraseTranslationMode = 'live' | 'cached' | 'contingency' | 'pending';
