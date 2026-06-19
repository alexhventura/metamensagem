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
import { translateCardContent, translateCardText } from '../lib/translation/translationEngine';
import type { CardContentDisplay, CardContentSource, CardLang } from '../lib/translation/types';
import {
  browserPreferredPageLang,
  persistPageTranslatePref,
  readPageTranslatePref,
  resolvePageLocale,
} from '../lib/translation/pageTranslateStorage';
import { pageLanguageNativeName } from '../lib/translation/pageLanguages';
import { CARD_LANG_SUCCESS_LABEL } from '../lib/translation/cardLanguages';
import { matchSupportedUiLocale, persistUiLocale } from '../lib/uiLocale';
import { setTranslatedViewActive } from '../lib/translatedViewState';
import { useTranslatedViewMeta } from '../lib/useTranslatedViewMeta';
import PageTranslateModal from '../components/PageTranslateModal';

type ContentRegistration = {
  id: string;
  getSource: () => CardContentSource;
  setDisplay: (display: CardContentDisplay) => void;
};

type PageTranslateContextValue = {
  targetLang: CardLang;
  isTranslating: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  selectLanguage: (lang: CardLang) => Promise<void>;
  resetToOriginal: () => void;
  registerContent: (registration: ContentRegistration) => () => void;
  refreshContent: (id: string) => void;
  translateLabels: (labels: string[], scopeId: string) => Promise<Map<string, string>>;
  browserLang: CardLang | null;
  successLabel: string | null;
  isNormalizedView: boolean;
};

const PageTranslateContext = createContext<PageTranslateContextValue | null>(null);

function pageLangToUiLocale(lang: CardLang): string {
  return matchSupportedUiLocale(lang) ?? 'en';
}

function syncUiLocaleStorage(lang: CardLang): void {
  const ui = matchSupportedUiLocale(lang);
  if (ui) persistUiLocale(ui);
}

export function PageTranslateProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const registrations = useRef(new Map<string, ContentRegistration>());
  const labelCache = useRef(new Map<string, string>());
  const initialLocale = useMemo(() => resolvePageLocale(), []);
  const [targetLang, setTargetLang] = useState<CardLang>(initialLocale);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNormalizedView, setIsNormalizedView] = useState(false);
  const originalMode = useRef(false);
  const autoStarted = useRef(false);
  const browserLang = useMemo(() => browserPreferredPageLang(), []);

  useTranslatedViewMeta(isNormalizedView);

  useEffect(() => {
    setTranslatedViewActive(isNormalizedView);
  }, [isNormalizedView]);

  const translateOne = useCallback(async (reg: ContentRegistration, lang: CardLang) => {
    const source = reg.getSource();
    if (!source.texto?.trim()) {
      reg.setDisplay({ ...source, isTranslated: false });
      return false;
    }
    try {
      const result = await translateCardContent(source, lang, {
        contentId: reg.id,
        sourceLang: 'pt',
      });
      reg.setDisplay(result);
      return result.isTranslated;
    } catch {
      reg.setDisplay({ ...source, isTranslated: false, translationFailed: true, targetLang: lang });
      return false;
    }
  }, []);

  const resetAll = useCallback(() => {
    for (const reg of registrations.current.values()) {
      const source = reg.getSource();
      reg.setDisplay({ ...source, isTranslated: false, translationFailed: false });
    }
    labelCache.current.clear();
    setIsNormalizedView(false);
    setTranslatedViewActive(false);
  }, []);

  const runPageTranslation = useCallback(
    async (lang: CardLang | null) => {
      if (!lang) {
        resetAll();
        persistPageTranslatePref(null);
        setTargetLang(resolvePageLocale());
        const fromPath = matchSupportedUiLocale(
          window.location.pathname.split('/').filter(Boolean)[0]
        );
        if (fromPath) {
          await i18n.changeLanguage(fromPath);
          persistUiLocale(fromPath);
        } else {
          const resolved = pageLangToUiLocale(resolvePageLocale());
          await i18n.changeLanguage(resolved);
          syncUiLocaleStorage(resolvePageLocale());
        }
        return;
      }

      setIsTranslating(true);
      persistPageTranslatePref(lang);
      syncUiLocaleStorage(lang);
      setTargetLang(lang);
      await i18n.changeLanguage(pageLangToUiLocale(lang));

      const results = await Promise.all(
        [...registrations.current.values()].map((reg) => translateOne(reg, lang))
      );
      const normalized = results.some(Boolean);
      setIsNormalizedView(normalized);
      setIsTranslating(false);
    },
    [i18n, resetAll, translateOne]
  );

  const selectLanguage = useCallback(
    async (lang: CardLang) => {
      setIsModalOpen(false);
      originalMode.current = false;
      await runPageTranslation(lang);
    },
    [runPageTranslation]
  );

  const resetToOriginal = useCallback(async () => {
    setIsModalOpen(false);
    originalMode.current = true;
    resetAll();
    persistPageTranslatePref(null);
    const fromPath = matchSupportedUiLocale(
      window.location.pathname.split('/').filter(Boolean)[0]
    );
    if (fromPath) {
      await i18n.changeLanguage(fromPath);
      persistUiLocale(fromPath);
    } else {
      await i18n.changeLanguage('pt');
      persistUiLocale('pt');
    }
    setTargetLang('pt');
  }, [i18n, resetAll]);

  const refreshContent = useCallback(
    (id: string) => {
      const reg = registrations.current.get(id);
      if (!reg || originalMode.current || !targetLang) return;
      void translateOne(reg, targetLang).then((changed) => {
        if (changed) setIsNormalizedView(true);
      });
    },
    [targetLang, translateOne]
  );

  const registerContent = useCallback(
    (registration: ContentRegistration) => {
      registrations.current.set(registration.id, registration);
      if (!originalMode.current && targetLang) {
        void translateOne(registration, targetLang).then((changed) => {
          if (changed) setIsNormalizedView(true);
        });
      }
      return () => {
        registrations.current.delete(registration.id);
      };
    },
    [targetLang, translateOne]
  );

  const translateLabels = useCallback(
    async (labels: string[], scopeId: string): Promise<Map<string, string>> => {
      if (originalMode.current || !targetLang || targetLang === 'pt') {
        return new Map(labels.map((l) => [l, l]));
      }

      const out = new Map<string, string>();
      await Promise.all(
        labels.map(async (label) => {
          const trimmed = label.trim();
          if (!trimmed) return;
          const cacheKey = `${targetLang}::${trimmed}`;
          if (labelCache.current.has(cacheKey)) {
            out.set(label, labelCache.current.get(cacheKey)!);
            return;
          }
          try {
            const translated = await translateCardText(trimmed, targetLang, 'pt', {
              contentId: `${scopeId}:label`,
            });
            labelCache.current.set(cacheKey, translated);
            out.set(label, translated);
          } catch {
            out.set(label, label);
          }
        })
      );
      if (out.size > 0 && targetLang !== 'pt') {
        setIsNormalizedView(true);
      }
      return out;
    },
    [targetLang]
  );

  useEffect(() => {
    if (autoStarted.current || originalMode.current) return;
    autoStarted.current = true;
    const pref = readPageTranslatePref();
    const locale = pref ?? browserLang ?? 'pt';
    void runPageTranslation(locale);
  }, [runPageTranslation, browserLang]);

  useEffect(() => {
    const open = () => setIsModalOpen(true);
    window.addEventListener('mm-open-page-translate', open);
    return () => window.removeEventListener('mm-open-page-translate', open);
  }, []);

  const successLabel =
    CARD_LANG_SUCCESS_LABEL[targetLang] ?? pageLanguageNativeName(targetLang);

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
      refreshContent,
      translateLabels,
      browserLang,
      successLabel,
      isNormalizedView,
    }),
    [
      targetLang,
      isTranslating,
      isModalOpen,
      selectLanguage,
      resetToOriginal,
      registerContent,
      refreshContent,
      translateLabels,
      browserLang,
      successLabel,
      isNormalizedView,
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

export function usePageTranslateOptional(): PageTranslateContextValue | null {
  return useContext(PageTranslateContext);
}
