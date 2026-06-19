import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { translateCardContent } from '../lib/translation/translationEngine';
import type { CardContentDisplay, CardContentSource, CardLang } from '../lib/translation/types';
import {
  browserPreferredPageLang,
  persistPageTranslatePref,
  readPageTranslatePref,
} from '../lib/translation/pageTranslateStorage';
import { pageLanguageNativeName } from '../lib/translation/pageLanguages';
import { CARD_LANG_SUCCESS_LABEL } from '../lib/translation/cardLanguages';
import { matchSupportedUiLocale } from '../lib/uiLocale';
import { useTranslatedViewMeta } from '../lib/useTranslatedViewMeta';
import PageTranslateModal from '../components/PageTranslateModal';

type ContentRegistration = {
  id: string;
  getSource: () => CardContentSource;
  setDisplay: (display: CardContentDisplay) => void;
  sourceLang?: CardLang;
};

type PageTranslateContextValue = {
  targetLang: CardLang | null;
  isTranslating: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  selectLanguage: (lang: CardLang) => Promise<void>;
  resetToOriginal: () => void;
  registerContent: (registration: ContentRegistration) => () => void;
  browserLang: CardLang | null;
  successLabel: string | null;
};

const PageTranslateContext = createContext<PageTranslateContextValue | null>(null);

function pageLangToUiLocale(lang: CardLang): string {
  const ui = matchSupportedUiLocale(lang);
  return ui ?? 'en';
}

export function PageTranslateProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const registrations = useRef(new Map<string, ContentRegistration>());
  const [targetLang, setTargetLang] = useState<CardLang | null>(() => readPageTranslatePref());
  const [isTranslating, setIsTranslating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [autoApplied, setAutoApplied] = useState(false);
  const browserLang = useMemo(() => browserPreferredPageLang(), []);

  useTranslatedViewMeta(targetLang !== null);

  const translateOne = useCallback(async (reg: ContentRegistration, lang: CardLang) => {
    const source = reg.getSource();
    if (!source.texto?.trim()) {
      reg.setDisplay({ ...source, isTranslated: false });
      return;
    }
    try {
      const result = await translateCardContent(source, lang, {
        contentId: reg.id,
        sourceLang: reg.sourceLang,
      });
      reg.setDisplay(result.isTranslated ? result : { ...source, isTranslated: false });
    } catch {
      reg.setDisplay({ ...source, isTranslated: false, translationFailed: true, targetLang: lang });
    }
  }, []);

  const resetAll = useCallback(() => {
    for (const reg of registrations.current.values()) {
      const source = reg.getSource();
      reg.setDisplay({ ...source, isTranslated: false, translationFailed: false });
    }
  }, []);

  const runPageTranslation = useCallback(
    async (lang: CardLang | null) => {
      if (!lang) {
        resetAll();
        setTargetLang(null);
        persistPageTranslatePref(null);
        return;
      }

      setIsTranslating(true);
      persistPageTranslatePref(lang);
      setTargetLang(lang);
      await i18n.changeLanguage(pageLangToUiLocale(lang));

      const tasks = [...registrations.current.values()].map((reg) => translateOne(reg, lang));
      await Promise.all(tasks);
      setIsTranslating(false);
    },
    [i18n, resetAll, translateOne]
  );

  const selectLanguage = useCallback(
    async (lang: CardLang) => {
      setIsModalOpen(false);
      await runPageTranslation(lang);
    },
    [runPageTranslation]
  );

  const resetToOriginal = useCallback(async () => {
    setIsModalOpen(false);
    await runPageTranslation(null);
    const fromPath = matchSupportedUiLocale(window.location.pathname.split('/').filter(Boolean)[0]);
    if (fromPath) {
      await i18n.changeLanguage(fromPath);
    }
  }, [i18n, runPageTranslation]);

  const registerContent = useCallback(
    (registration: ContentRegistration) => {
      registrations.current.set(registration.id, registration);
      if (targetLang) {
        void translateOne(registration, targetLang);
      }
      return () => {
        registrations.current.delete(registration.id);
      };
    },
    [targetLang, translateOne]
  );

  useEffect(() => {
    if (!targetLang || autoApplied) return;
    setAutoApplied(true);
    void i18n.changeLanguage(pageLangToUiLocale(targetLang));
  }, [autoApplied, i18n, targetLang]);

  useEffect(() => {
    const open = () => setIsModalOpen(true);
    window.addEventListener('mm-open-page-translate', open);
    return () => window.removeEventListener('mm-open-page-translate', open);
  }, []);

  const successLabel = targetLang
    ? CARD_LANG_SUCCESS_LABEL[targetLang] ?? pageLanguageNativeName(targetLang)
    : null;

  const value = useMemo<PageTranslateContextValue>(
    () => ({
      targetLang,
      isTranslating,
      isModalOpen,
      openModal: () => setIsModalOpen(true),
      closeModal: () => setIsModalOpen(false),
      selectLanguage,
      resetToOriginal,
      registerContent,
      browserLang,
      successLabel,
    }),
    [
      targetLang,
      isTranslating,
      isModalOpen,
      selectLanguage,
      resetToOriginal,
      registerContent,
      browserLang,
      successLabel,
    ]
  );

  return (
    <PageTranslateContext.Provider value={value}>
      {children}
      <PageTranslateModal />
    </PageTranslateContext.Provider>
  );
}

export function usePageTranslate(): PageTranslateContextValue {
  const ctx = useContext(PageTranslateContext);
  if (!ctx) {
    throw new Error('usePageTranslate must be used within PageTranslateProvider');
  }
  return ctx;
}

/** Opcional — retorna null fora do provider (ex.: testes). */
export function usePageTranslateOptional(): PageTranslateContextValue | null {
  return useContext(PageTranslateContext);
}
