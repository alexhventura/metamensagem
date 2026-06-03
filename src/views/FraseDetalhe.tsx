/**
 * InfoSec: esta view roda no navegador. Dados vêm de loadFraseDetailBySlug → Supabase anon + RLS.
 * Proibido: DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou qualquer secret sem prefixo VITE_.
 * Permitido no cliente: apenas VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (via supabaseClient).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useAppUiReset } from '../hooks/useAppUiReset';
const ImageGeneratorModal = lazy(() => import('../components/image-generator'));
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import BackNavButton from '../components/BackNavButton';
import TranslationContingencyNotice from '../components/TranslationContingencyNotice';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { Copy, Share2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CardTooltip from '../components/CardTooltip';
import { CardTranslateMenu } from '../components/CardTranslateMenu';

import {
  CARD_ACTION_BTN,
  FRASE_DETAIL_INFO_BG_LIGHT,
  cardAccentDotClass,
  cardBorderGradient,
  cardImageBtnClass,
  cardNeutralActionClass,
  cardTagClass,
} from '../lib/cardTheme';
import { type CardContentDisplay } from '../lib/translation';
import {
  getFraseCmsBySlugSync,
  loadFraseDetailBySlug,
  fraseShareUrl,
  fraseToListItem,
  fraseCmsFromListItem,
  type FraseCms,
} from '../lib/frasesModel';
import { fraseTextoOf, fraseAutorOf } from '../../lib/frases/detailLookup';
import { formatTagForDisplay } from '../lib/tagDisplay';
import { sanitizeTextForTranslation } from '../lib/textSanitize';
import type { ItemConteudo } from '../types/content';
import { pathFromTag } from '../lib/tagsSeo';
import {
  fraseCanonicalUrl,
  fraseHreflangAlternates,
  frasePath,
  htmlLangAttribute,
  parseFraseRoute,
  resolveFraseContentLocale,
  seoLocaleFromLanguageOriginal,
} from '../lib/i18nRoutes';
import { availableLanguagesFromMeta, loadFraseI18nMeta } from '../lib/globalSeoClient';
import { pickTitleDescription } from '../../lib/seo/i18nTemplates';
import { useTranslatedViewMeta } from '../lib/useTranslatedViewMeta';
import { applyHreflangLinks } from '../lib/seoHreflang';
import { ogImageUrlForPhrase } from '../lib/seo/ogImageUrl';
import type { SeoLocale } from '../../lib/i18n/locales';
import { SOURCE_CONTENT_LOCALE } from '../../lib/i18n/platform';
import { getOrCreatePhraseTranslation } from '../lib/translation/phraseTranslationService';
import { TranslationContingencyError } from '../lib/translation/types';
import { trackPhraseEvent } from '../lib/analytics/phrasePopularity';

function MudarMetaSEO({
  title,
  description,
  canonical,
  hreflangLinks,
  htmlLang,
  ogImage,
}: {
  title: string;
  description: string;
  canonical: string;
  hreflangLinks: { hreflang: string; href: string }[];
  htmlLang: string;
  ogImage?: string;
}) {
  useEffect(() => {
    const prevLang = document.documentElement.lang;
    document.documentElement.lang = htmlLang;
    const siteTitle = title.includes('Metamensagem') ? title : `${title} | Metamensagem`;
    document.title = siteTitle;

    const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', siteTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'article');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('name', 'twitter:title', siteTitle);
    upsertMeta('name', 'twitter:description', description);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;

    if (ogImage) {
      upsertMeta('property', 'og:image', ogImage);
      upsertMeta('name', 'twitter:image', ogImage);
      upsertMeta('name', 'twitter:card', 'summary_large_image');
    }

    applyHreflangLinks(hreflangLinks);
    return () => {
      document.documentElement.lang = prevLang;
    };
  }, [title, description, canonical, hreflangLinks, htmlLang, ogImage]);

  return null;
}

function MetaRow({
  label,
  value,
  tema,
}: {
  label: string;
  value: string | null | undefined;
  tema: string;
}) {
  if (!value) return null;
  return (
    <div
      className={`py-3 border-b last:border-0 ${
        tema === 'light' ? 'border-purple-200/60' : 'border-zinc-800/80'
      }`}
    >
      <dt
        className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
          tema === 'light' ? 'text-purple-600/80' : 'text-zinc-500'
        }`}
      >
        {label}
      </dt>
      <dd className={`text-sm leading-relaxed ${tema === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}>
        {value}
      </dd>
    </div>
  );
}

export default function FraseDetalheView({
  tema,
  toast,
}: {
  tema: string;
  toast: (msg: string) => void;
}) {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const routeInfo = useMemo(() => parseFraseRoute(location.pathname), [location.pathname]);
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const quoteInView = useInView(quoteRef, { once: true, amount: 0.2 });

  const preloadedFrase = useMemo(() => {
    const state = location.state as { item?: ItemConteudo; frase?: FraseCms } | null;
    if (state?.frase) return state.frase;
    if (state?.item?.tipo === 'frase') return fraseCmsFromListItem(state.item);
    return null;
  }, [location.state]);

  const [i18nMeta, setI18nMeta] = useState<Awaited<ReturnType<typeof loadFraseI18nMeta>>>(null);
  const [frase, setFrase] = useState<FraseCms | null>(() => {
    const initial = preloadedFrase ?? (slug ? getFraseCmsBySlugSync(slug) ?? null : null);
    return initial;
  });
  const [loading, setLoading] = useState(() => !preloadedFrase && !frase && !!slug);
  /** true = 404 / não encontrada; false com loadFailed = erro de rede/servidor */
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);
  const closeImageModal = useCallback(() => setImageQuote(null), []);
  useAppUiReset(closeImageModal);
  const [display, setDisplay] = useState<CardContentDisplay>(() => {
    const initial = preloadedFrase ?? (slug ? getFraseCmsBySlugSync(slug) : null);
    if (!initial) return { texto: '', isTranslated: false };
    return {
      texto: fraseTextoOf(initial),
      autor: fraseAutorOf(initial),
      isTranslated: false,
    };
  });
  const [translating, setTranslating] = useState(false);
  const [translationContingency, setTranslationContingency] = useState(false);
  /** Locale para o qual o loader já trouxe texto em `frases_traducoes` (evita API legada). */
  const [loaderCachedLocale, setLoaderCachedLocale] = useState<SeoLocale | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setNotFound(false);
    setLoadFailed(false);
    setLoaderCachedLocale(null);

    if (!preloadedFrase) {
      setLoading(true);
      setFrase(null);
      setDisplay({ texto: '', isTranslated: false });
    } else {
      setFrase(preloadedFrase);
      setDisplay({
        texto: fraseTextoOf(preloadedFrase),
        autor: fraseAutorOf(preloadedFrase),
        isTranslated: false,
      });
      setLoading(false);
    }

    const i18nTimer = window.setTimeout(() => {
      if (cancel) return;
      void loadFraseI18nMeta(slug).then((meta) => {
        if (!cancel && meta) setI18nMeta(meta);
      });
    }, 3000);

    (async () => {
      try {
        const bundle = await loadFraseDetailBySlug(slug, {
          prefixLocale: routeInfo?.prefixLocale ?? null,
        });
        if (cancel) return;
        if (bundle) {
          const { frase: loaded, display: loadedDisplay } = bundle;
          const loadedText = fraseTextoOf(loaded).trim();
          if (!loadedText) {
            setFrase(null);
            setNotFound(true);
            setLoading(false);
            return;
          }
          setFrase(loaded);
          setDisplay(loadedDisplay);
          if (loadedDisplay.isTranslated && loadedDisplay.targetLang) {
            setLoaderCachedLocale(loadedDisplay.targetLang);
          }
          trackPhraseEvent(loaded.slug, 'view', {
            phrase_id: loaded.id,
            category: loaded.categoria,
            locale: routeInfo?.prefixLocale ?? undefined,
          });
          const canonical = loaded.slug.toLowerCase();
          if (slug && canonical !== slug.toLowerCase()) {
            const def = seoLocaleFromLanguageOriginal(
              loaded.semantica?.languageOriginal ||
                loaded.semantica?.idiomaOriginal
            );
            const prefix = routeInfo?.prefixLocale ?? null;
            navigate(frasePath(canonical, prefix ?? def, def), {
              replace: true,
              state: location.state,
            });
          }
          setLoading(false);
          return;
        }
        const sync = getFraseCmsBySlugSync(slug);
        const resolved = sync ?? preloadedFrase ?? null;
        setFrase(resolved);
        if (resolved) {
          setDisplay({
            texto: resolved.frase_original,
            autor: resolved.autor_original,
            isTranslated: false,
          });
        }
        if (!resolved) setNotFound(true);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[FraseDetalhe] falha ao carregar (detalhes técnicos só em dev)', err);
        }
        if (!cancel) {
          const fallback = preloadedFrase ?? getFraseCmsBySlugSync(slug) ?? null;
          setFrase(fallback);
          if (fallback) {
            setNotFound(false);
            setLoadFailed(false);
          } else {
            setNotFound(false);
            setLoadFailed(true);
          }
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
      window.clearTimeout(i18nTimer);
    };
  }, [slug, preloadedFrase, navigate, location.state, routeInfo?.prefixLocale]);

  const defaultLocale: SeoLocale = useMemo(
    () =>
      seoLocaleFromLanguageOriginal(
        frase?.semantica?.languageOriginal ||
          frase?.semantica?.idiomaOriginal ||
          i18nMeta?.languageOriginal
      ),
    [frase, i18nMeta?.languageOriginal]
  );

  const contentLocale: SeoLocale = useMemo(
    () => resolveFraseContentLocale(routeInfo?.prefixLocale ?? null, defaultLocale),
    [routeInfo?.prefixLocale, defaultLocale]
  );

  useEffect(() => {
    if (!frase) return;
    let cancel = false;

    const showOriginal = () => {
      setDisplay({
        texto: frase.frase_original,
        autor: frase.autor_original,
        explicacao: frase.explicacao || undefined,
        isTranslated: false,
      });
    };

    if (contentLocale === defaultLocale || contentLocale === SOURCE_CONTENT_LOCALE) {
      showOriginal();
      return;
    }

    if (loaderCachedLocale === contentLocale) {
      setTranslationContingency(false);
      return;
    }

    showOriginal();
    setTranslationContingency(false);

    const translateDelayMs = loading ? 2000 : 1500;
    const translateTimer = window.setTimeout(() => {
      if (cancel) return;
      setTranslating(true);
      void getOrCreatePhraseTranslation(frase.slug, frase.frase_original, contentLocale, {
        contentId: frase.id,
        category: frase.categoria,
      })
        .then((result) => {
          if (cancel) return;
          setTranslationContingency(false);
          setDisplay({
            texto: result.text,
            autor: frase.autor_original,
            explicacao: frase.explicacao || undefined,
            isTranslated: result.locale !== defaultLocale && result.mode !== 'contingency',
            targetLang: contentLocale,
          });
        })
        .catch((err) => {
          if (!cancel) {
            showOriginal();
            setTranslationContingency(err instanceof TranslationContingencyError);
          }
        })
        .finally(() => {
          if (!cancel) setTranslating(false);
        });
    }, translateDelayMs);

    return () => {
      cancel = true;
      window.clearTimeout(translateTimer);
    };
  }, [
    frase?.id,
    frase?.slug,
    frase?.frase_original,
    frase?.autor_original,
    frase?.categoria,
    contentLocale,
    defaultLocale,
    loading,
    loaderCachedLocale,
  ]);

  const listItem = useMemo(() => (frase ? fraseToListItem(frase) : null), [frase]);

  const translateSource = useMemo(
    () =>
      frase
        ? {
            texto: frase.frase_original,
            autor: frase.autor_original,
            explicacao: frase.explicacao ?? undefined,
          }
        : { texto: '' },
    [frase?.frase_original, frase?.autor_original, frase?.explicacao]
  );

  const canonical = frase ? fraseCanonicalUrl(frase.slug, contentLocale, defaultLocale) : '';
  const availableLangs = frase
    ? availableLanguagesFromMeta(
        i18nMeta,
        frase.semantica?.languageOriginal || frase.semantica?.idiomaOriginal
      )
    : [defaultLocale];
  const hreflangLinks = frase
    ? fraseHreflangAlternates(frase.slug, defaultLocale, availableLangs)
    : [];
  const pageHtmlLang = htmlLangAttribute(contentLocale);
  const quoteText =
    display.texto || (frase ? fraseTextoOf(frase) : '') || '';
  const authorLine =
    display.autor || (frase ? fraseAutorOf(frase) : '') || '';
  useTranslatedViewMeta(display.isTranslated);

  const handleCopy = () => {
    if (!frase) return;
    trackPhraseEvent(frase.slug, 'copy', {
      phrase_id: frase.id,
      category: frase.categoria,
      locale: contentLocale,
    });
    navigator.clipboard.writeText(`${quoteText} — ${authorLine}`);
    toast(t('common.copied'));
  };

  const handleShare = async () => {
    if (!frase) return;
    trackPhraseEvent(frase.slug, 'share', {
      phrase_id: frase.id,
      category: frase.categoria,
      locale: contentLocale,
    });
    const shareUrl = fraseShareUrl(frase, contentLocale, defaultLocale);
    const payload = {
      title: frase.autor_original,
      text: `${quoteText} — ${authorLine}`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
    await navigator.clipboard.writeText(`${payload.text}\n${shareUrl}`);
    toast(t('common.link_copied'));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-20">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!frase || !listItem || !quoteText.trim()) {
    const statusMessage = loadFailed
      ? t(
          'frases.load_failed',
          'Não foi possível carregar esta frase. Tente novamente em instantes.'
        )
      : notFound || !quoteText.trim()
        ? t(
            'frases.not_found',
            'Frase não encontrada. O link compartilhado pode estar desatualizado.'
          )
        : t('home.sharing_wisdom');
    return (
      <div className="p-20 text-center text-red-400" role="alert">
        <p>{statusMessage}</p>
        <div className="mt-4">
          <BackNavButton label={t('nav.back_quotes', 'Voltar às frases')} fallbackPath="/frases" />
        </div>
      </div>
    );
  }

  const descriptionFallback =
    frase.explicacao ||
    `Frase de ${frase.autor_original}${frase.ano_ou_data ? ` (${frase.ano_ou_data})` : ''}`;
  const seoPack = pickTitleDescription(i18nMeta, contentLocale, {
    title: frase.frase_original.slice(0, 70),
    description: descriptionFallback,
  });

  const neutralAction = cardNeutralActionClass(tema);
  const hasExtraInfo =
    !!frase.explicacao ||
    !!frase.ano_ou_data ||
    !!frase.nacionalidade ||
    !!frase.nascimento_falecimento ||
    !!frase.autor_tipo ||
    !!frase.fontes ||
    !!frase.observacao ||
    frase.palavras_chave.length > 0 ||
    !!frase.informacoes?.ultima_atualizacao ||
    !!frase.informacoes?.confiabilidade;

  const pageShellClass = 'max-w-3xl w-full mx-auto px-4 py-10 flex-1';
  const quoteClassName = `text-3xl md:text-4xl font-black leading-[1.15] tracking-tight mb-5 transition-opacity ${
    translating ? 'opacity-55' : 'opacity-100'
  } ${tema === 'light' ? 'text-black' : 'text-white'}`;

  const PageShell = reduceMotion ? 'div' : motion.div;
  const pageMotionProps = reduceMotion
    ? { className: pageShellClass }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        className: pageShellClass,
      };

  return (
    <PageShell {...pageMotionProps}>
      <MudarMetaSEO
        title={seoPack.title}
        description={seoPack.description}
        canonical={canonical}
        hreflangLinks={hreflangLinks}
        htmlLang={pageHtmlLang}
        ogImage={ogImageUrlForPhrase(frase.id)}
      />

      <nav className="sr-only" aria-label="Idiomas">
        {hreflangLinks.map((l) => (
          <a key={l.hreflang} href={l.href} hrefLang={l.hreflang}>
            {l.hreflang}
          </a>
        ))}
      </nav>

      <BackNavButton label={t('nav.back_quotes', 'Voltar às frases')} fallbackPath="/frases" />

      <article className={`p-[1px] rounded-[2.5rem] ${cardBorderGradient('purple')} shadow-xl`}>
        <div
          className={`rounded-[2.5rem] overflow-hidden ${
            tema === 'light' ? 'bg-white' : 'bg-[#0a0a0a]'
          }`}
        >
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-2 mb-6">
              <span className={`w-1.5 h-1.5 rounded-full ${cardAccentDotClass('purple')}`} />
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
                frase
              </span>
            </div>

            {reduceMotion ? (
              <blockquote ref={quoteRef} className={quoteClassName}>
                &ldquo;{sanitizeTextForTranslation(quoteText)}&rdquo;
              </blockquote>
            ) : (
              <AnimatePresence mode="wait">
                <motion.blockquote
                  ref={quoteRef}
                  key={quoteText + String(display.isTranslated)}
                  initial={quoteInView ? false : { opacity: 0, y: 6 }}
                  animate={quoteInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={quoteClassName}
                >
                  &ldquo;{sanitizeTextForTranslation(quoteText)}&rdquo;
                </motion.blockquote>
              </AnimatePresence>
            )}

            <p
              className={`text-sm font-bold tracking-wide mb-6 ${
                tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              — {authorLine}
            </p>

            {translationContingency && (
              <TranslationContingencyNotice tema={tema} className="mb-6" />
            )}

            <div className="flex flex-wrap gap-1.5 mb-8">
              {[frase.categoria, ...frase.contextos]
                .map((c) => formatTagForDisplay(c))
                .filter((c): c is string => Boolean(c))
                .map((label) => (
                  <Link
                    key={label}
                    to={pathFromTag(label)}
                    className={`text-[9px] font-black px-2.5 py-1 rounded-full border transition-colors ${cardTagClass('purple')}`}
                  >
                    #{label}
                  </Link>
                ))}
            </div>

            <div className="flex justify-end items-end gap-2 pt-6 border-t border-zinc-500/10 min-h-[3.375rem]">
              <CardTooltip text={t('common.copy')} tema={tema}>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`${CARD_ACTION_BTN} ${neutralAction}`}
                  aria-label={t('common.copy')}
                >
                  <Copy size={18} aria-hidden />
                </button>
              </CardTooltip>

              <CardTooltip text={t('common.share')} tema={tema}>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className={`${CARD_ACTION_BTN} ${neutralAction}`}
                  aria-label={t('common.share')}
                >
                  <Share2 size={18} aria-hidden />
                </button>
              </CardTooltip>

              <CardTooltip text={t('common.translate')} tema={tema}>
                <CardTranslateMenu
                  tema={tema}
                  accent="purple"
                  contentId={frase.id}
                  sourceLang={defaultLocale}
                  source={translateSource}
                  onDisplayChange={setDisplay}
                  onLoadingChange={setTranslating}
                  tooltipLabel={t('common.translate')}
                  menuPlacement="top"
                />
              </CardTooltip>

              <CardTooltip text={t('common.generate_image', 'Gerar Imagem')} tema={tema}>
                <button
                  type="button"
                  onClick={() =>
                    setImageQuote({
                      id: frase.id,
                      texto: display.texto || frase.frase_original,
                      autor: display.autor || frase.autor_original,
                      tags: frase.palavras_chave.length
                        ? frase.palavras_chave
                        : [frase.categoria, ...frase.contextos],
                      categoria: frase.categoria,
                      slug: frase.slug,
                      locale: contentLocale,
                    })
                  }
                  className={cardImageBtnClass('purple')}
                  aria-label={t('common.generate_image', 'Gerar Imagem')}
                >
                  <Sparkles size={18} />
                </button>
              </CardTooltip>
            </div>
          </div>

          {hasExtraInfo ? (
            <div
              className={`px-8 md:px-10 pb-8 md:pb-10 pt-6 border-t ${
                tema === 'light'
                  ? `${FRASE_DETAIL_INFO_BG_LIGHT} border-purple-200/50`
                  : 'bg-zinc-950/40 border-zinc-800'
              }`}
            >
              {frase.explicacao ? (
                <section className="mb-6">
                  <h2
                    className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                      tema === 'light' ? 'text-purple-700' : 'text-purple-400'
                    }`}
                  >
                    Explicação
                  </h2>
                  <p
                    className={`text-base leading-relaxed ${
                      tema === 'light' ? 'text-zinc-800' : 'text-zinc-400'
                    }`}
                  >
                    {display.explicacao ?? frase.explicacao}
                  </p>
                </section>
              ) : null}

              <dl
                className={`rounded-2xl border p-4 ${
                  tema === 'light'
                    ? 'border-purple-200/60 bg-white/60'
                    : 'border-zinc-800/60 bg-zinc-900/30'
                }`}
              >
                <MetaRow label="Ano ou data" value={frase.ano_ou_data} tema={tema} />
                <MetaRow label="Nacionalidade" value={frase.nacionalidade} tema={tema} />
                <MetaRow label="Nascimento / falecimento" value={frase.nascimento_falecimento} tema={tema} />
                <MetaRow label="Tipo de autor" value={frase.autor_tipo} tema={tema} />
                <MetaRow label="Fontes" value={frase.fontes} tema={tema} />
                <MetaRow label="Observação" value={frase.observacao} tema={tema} />
                {frase.palavras_chave.length > 0 && (
                  <MetaRow label="Palavras-chave" value={frase.palavras_chave.join(', ')} tema={tema} />
                )}
                {frase.informacoes?.ultima_atualizacao && (
                  <MetaRow label="Última atualização" value={frase.informacoes.ultima_atualizacao} tema={tema} />
                )}
                {frase.informacoes?.confiabilidade && (
                  <MetaRow label="Confiabilidade" value={frase.informacoes.confiabilidade} tema={tema} />
                )}
              </dl>
            </div>
          ) : null}
        </div>
      </article>

      {imageQuote && (
        <Suspense fallback={null}>
          <ImageGeneratorModal
            open
            quote={imageQuote}
            onClose={closeImageModal}
            toast={toast}
            tema={tema}
          />
        </Suspense>
      )}
    </PageShell>
  );
}
