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
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { Copy, Share2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CardTooltip from '../components/CardTooltip';
import PageTranslateButton from '../components/PageTranslateButton';
import { useTranslatedLabels } from '../hooks/useTranslatedLabels';

import {
  CARD_ACTION_BTN,
  FRASE_DETAIL_INFO_BG_LIGHT,
  cardAccentDotClass,
  cardBorderGradient,
  cardImageBtnClass,
  cardNeutralActionClass,
  cardTagClass,
} from '../lib/cardTheme';
import {
  getFraseCmsBySlugSync,
  loadFraseDetailBySlug,
  fraseShareUrl,
  fraseToListItem,
  fraseCmsFromListItem,
  searchFrasesByCategoria,
  type FraseCms,
} from '../lib/frasesModel';
import { fraseTextoOf, fraseAutorOf } from '../../lib/frases/detailLookup';
import { formatTagForDisplay, tagsForDisplay } from '../lib/tagDisplay';
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
import { loadFraseI18nMeta } from '../lib/globalSeoClient';
import { pickTitleDescription } from '../../lib/seo/i18nTemplates';
import { applyHreflangLinks } from '../lib/seoHreflang';
import { ogImageUrlForPhrase } from '../lib/seo/ogImageUrl';
import type { SeoLocale } from '../../lib/i18n/locales';
import { prefetchFraseDetail } from '../lib/prefetchFrase';
import { trackPhraseEvent } from '../lib/analytics/phrasePopularity';
import { languageOriginalLabel } from '../lib/languageDisplay';
import { usePageContentTranslate } from '../hooks/usePageContentTranslate';

function MudarMetaSEO({
  title,
  description,
  canonical,
  hreflangLinks,
  htmlLang,
  ogImage,
  jsonLD,
}: {
  title: string;
  description: string;
  canonical: string;
  hreflangLinks: { hreflang: string; href: string }[];
  htmlLang: string;
  ogImage?: string;
  jsonLD?: object;
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

    const idScript = 'jsonld-frase-detalhe';
    let ld = document.getElementById(idScript);
    if (jsonLD) {
      if (!ld) {
        ld = document.createElement('script');
        ld.id = idScript;
        ld.setAttribute('type', 'application/ld+json');
        document.head.appendChild(ld);
      }
      ld.textContent = JSON.stringify(jsonLD);
    } else if (ld) {
      ld.remove();
    }

    return () => {
      document.documentElement.lang = prevLang;
    };
  }, [title, description, canonical, hreflangLinks, htmlLang, ogImage, jsonLD]);

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
          tema === 'light' ? 'text-purple-600/80' : 'text-zinc-400'
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
  /** Stub do card (sem explicacao) — fetch completo em andamento */
  const [fetchingDetail, setFetchingDetail] = useState(
    () => !!(preloadedFrase && !preloadedFrase.explicacao?.trim())
  );
  /** true = 404 / não encontrada; false com loadFailed = erro de rede/servidor */
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);
  const closeImageModal = useCallback(() => setImageQuote(null), []);
  useAppUiReset(closeImageModal);
  const [relatedSlugs, setRelatedSlugs] = useState<
    { slug: string; titulo: string; id: string }[]
  >([]);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setNotFound(false);
    setLoadFailed(false);

    if (!preloadedFrase) {
      setLoading(true);
      setFrase(null);
      setFetchingDetail(false);
    } else {
      setFrase(preloadedFrase);
      setLoading(false);
      setFetchingDetail(!preloadedFrase.explicacao?.trim());
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
          const { frase: loaded } = bundle;
          const loadedText = fraseTextoOf(loaded).trim();
          if (!loadedText) {
            setFrase(null);
            setNotFound(true);
            setLoading(false);
            return;
          }
          setFrase(loaded);
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
        if (!cancel) {
          setLoading(false);
          setFetchingDetail(false);
        }
      }
    })();

    return () => {
      cancel = true;
      window.clearTimeout(i18nTimer);
    };
  }, [slug, preloadedFrase, navigate, location.state, routeInfo?.prefixLocale]);

  useEffect(() => {
    if (!frase?.categoria) return;
    let cancel = false;
    void searchFrasesByCategoria(frase.categoria, { limit: 10 }).then((hits) => {
      if (cancel) return;
      setRelatedSlugs(
        hits
          .filter((h) => h.slug !== frase.slug.toLowerCase())
          .slice(0, 8)
          .map((h) => ({ slug: h.slug, titulo: h.titulo, id: h.id }))
      );
    });
    return () => {
      cancel = true;
    };
  }, [frase?.slug, frase?.categoria]);

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

  const contentSource = useMemo(
    () => ({
      texto: frase ? fraseTextoOf(frase) : '',
      autor: frase ? fraseAutorOf(frase) : undefined,
      explicacao: frase?.explicacao?.trim() || undefined,
    }),
    [frase?.id, frase?.frase_original, frase?.autor_original, frase?.explicacao]
  );

  const { display } = usePageContentTranslate({
    id: frase?.id ?? slug ?? 'frase-detail',
    source: contentSource,
  });

  const listItem = useMemo(() => (frase ? fraseToListItem(frase) : null), [frase]);

  const canonical = frase ? fraseCanonicalUrl(frase.slug, contentLocale, defaultLocale) : '';
  const availableLangs = [defaultLocale];
  const hreflangLinks = frase
    ? fraseHreflangAlternates(frase.slug, defaultLocale, availableLangs)
    : [];
  const pageHtmlLang = htmlLangAttribute(contentLocale);
  const quoteText =
    display.texto || (frase ? fraseTextoOf(frase) : '') || '';
  const authorLine =
    display.autor || (frase ? fraseAutorOf(frase) : '') || '';

  const seoPack = useMemo(() => {
    if (!frase?.frase_original?.trim()) {
      return { title: t('frases.not_found', 'Frase não encontrada'), description: '' };
    }
    const descriptionFallback =
      frase.explicacao ||
      `Frase de ${frase.autor_original}${frase.ano_ou_data ? ` (${frase.ano_ou_data})` : ''}`;
    return pickTitleDescription(i18nMeta, contentLocale, {
      title: `${frase.frase_original.slice(0, 72)}${frase.frase_original.length > 72 ? '…' : ''} — ${frase.autor_original}`,
      description: descriptionFallback,
    });
  }, [frase, i18nMeta, contentLocale, t]);

  const quotationJsonLd = useMemo(
    () => {
      if (!frase?.frase_original?.trim()) return undefined;
      const categoryLabel = formatTagForDisplay(frase.categoria) ?? 'Reflexão';
      const themeLabel =
        tagsForDisplay([frase.categoria, ...frase.contextos, ...frase.palavras_chave], 1)[0] ??
        categoryLabel;
      const breadcrumb = [
        { name: 'Início', item: 'https://metamensagem.com/' },
        { name: 'Frases', item: 'https://metamensagem.com/frases' },
        { name: themeLabel, item: pathFromTag(themeLabel) },
        { name: frase.autor_original, item: canonical },
        { name: frase.frase_original.slice(0, 80), item: canonical },
      ];
      return {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': canonical,
            url: canonical,
            name: seoPack.title,
            description: seoPack.description,
            inLanguage: pageHtmlLang.replace('_', '-'),
            isPartOf: {
              '@type': 'WebSite',
              name: 'Metamensagem',
              url: 'https://metamensagem.com',
            },
            breadcrumb: {
              '@id': `${canonical}#breadcrumb`,
            },
          },
          {
            '@type': 'Quotation',
            '@id': `${canonical}#quotation`,
            text: frase.frase_original,
            name: frase.frase_original.slice(0, 120),
            author: {
              '@id': `${canonical}#author`,
            },
            about: themeLabel,
            genre: categoryLabel,
            url: canonical,
            inLanguage: pageHtmlLang.replace('_', '-'),
            isPartOf: {
              '@id': `${canonical}#creative-work`,
            },
          },
          {
            '@type': 'CreativeWork',
            '@id': `${canonical}#creative-work`,
            name: seoPack.title,
            abstract: frase.explicacao || seoPack.description,
            text: frase.frase_original,
            author: {
              '@id': `${canonical}#author`,
            },
            about: themeLabel,
            genre: categoryLabel,
            inLanguage: pageHtmlLang.replace('_', '-'),
          },
          {
            '@type': 'Person',
            '@id': `${canonical}#author`,
            name: frase.autor_original,
          },
          {
            '@type': 'BreadcrumbList',
            '@id': `${canonical}#breadcrumb`,
            itemListElement: breadcrumb.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.name,
              item: item.item.startsWith('http')
                ? item.item
                : `https://metamensagem.com${item.item}`,
            })),
          },
        ],
      };
    },
    [frase, canonical, pageHtmlLang, seoPack.description, seoPack.title]
  );

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

  const neutralAction = cardNeutralActionClass(tema);
  const originalLanguageName = languageOriginalLabel(defaultLocale);
  const normalizedCategory = formatTagForDisplay(frase.categoria) ?? 'Reflexão';
  const normalizedThemes = tagsForDisplay(
    [frase.categoria, ...frase.contextos, ...frase.palavras_chave],
    8
  );
  const primaryTheme = normalizedThemes[0] ?? normalizedCategory;

  const labelPool = useMemo(
    () => [
      ...normalizedThemes,
      normalizedCategory,
      ...relatedSlugs.map((r) => r.titulo),
    ],
    [normalizedThemes, normalizedCategory, relatedSlugs]
  );
  const { labelFor } = useTranslatedLabels(labelPool, `frase-labels-${frase?.slug ?? slug ?? 'detail'}`);
  const hasExtraInfo =
    !!originalLanguageName ||
    !!frase.explicacao ||
    fetchingDetail ||
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
  const quoteClassName = `text-3xl md:text-4xl font-black leading-[1.15] tracking-tight mb-5 transition-opacity opacity-100 ${
    tema === 'light' ? 'text-black' : 'text-white'
  }`;

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
        jsonLD={quotationJsonLd}
      />

      <nav className="sr-only" aria-label="Idiomas">
        {hreflangLinks.map((l) => (
          <a key={l.hreflang} href={l.href} hrefLang={l.hreflang}>
            {l.hreflang}
          </a>
        ))}
      </nav>

      <BackNavButton label={t('nav.back_quotes', 'Voltar às frases')} fallbackPath="/frases" />

      <nav
        aria-label="Breadcrumb"
        className={`mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] ${
          tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'
        }`}
      >
        <Link to="/" className="hover:text-[#A855F7]">
          {t('nav.home')}
        </Link>
        <span aria-hidden>&gt;</span>
        <Link to="/frases" className="hover:text-[#A855F7]">
          {t('nav.frases')}
        </Link>
        <span aria-hidden>&gt;</span>
        <Link to={pathFromTag(primaryTheme)} className="hover:text-[#A855F7]">
          {labelFor(primaryTheme)}
        </Link>
        <span aria-hidden>&gt;</span>
        <span className="max-w-[12rem] truncate">{authorLine}</span>
      </nav>

      <article className={`p-[1px] rounded-[2.5rem] ${cardBorderGradient('purple')} shadow-xl`}>
        <div
          className={`rounded-[2.5rem] overflow-hidden ${
            tema === 'light' ? 'bg-white' : 'bg-[#141210]'
          }`}
        >
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-2 mb-6">
              <span className={`w-1.5 h-1.5 rounded-full ${cardAccentDotClass('purple')}`} />
              <span className={`text-[10px] uppercase font-black tracking-widest ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {t('frases.label', 'frase')}
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

            <p
              className={`mb-5 inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                tema === 'light'
                  ? 'bg-purple-50 text-purple-700 border border-purple-100'
                  : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
              }`}
            >
              {t('frases.original_language', 'Idioma original: {{lang}}', {
                lang: originalLanguageName,
              })}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-8">
              {normalizedThemes.map((label) => (
                <Link
                  key={label}
                  to={pathFromTag(label)}
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full border transition-colors ${cardTagClass('purple', tema)}`}
                >
                  #{labelFor(label)}
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

              <PageTranslateButton tema={tema} accent="purple" variant="pill" />

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
              {frase.explicacao || fetchingDetail ? (
                <section className="mb-6">
                  <h2
                    className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                      tema === 'light' ? 'text-purple-700' : 'text-purple-400'
                    }`}
                  >
                    {t('frases.explanation', 'Explicação')}
                  </h2>
                  {frase.explicacao ? (
                    <p
                      className={`text-base leading-relaxed ${
                        tema === 'light' ? 'text-zinc-800' : 'text-zinc-400'
                      }`}
                    >
                      {display.explicacao ?? frase.explicacao}
                    </p>
                  ) : (
                    <div className="space-y-2" aria-busy="true" aria-live="polite">
                      <div
                        className={`h-3 rounded animate-pulse ${
                          tema === 'light' ? 'bg-purple-100' : 'bg-zinc-800'
                        }`}
                      />
                      <div
                        className={`h-3 w-5/6 rounded animate-pulse ${
                          tema === 'light' ? 'bg-purple-100' : 'bg-zinc-800'
                        }`}
                      />
                      <div
                        className={`h-3 w-2/3 rounded animate-pulse ${
                          tema === 'light' ? 'bg-purple-100' : 'bg-zinc-800'
                        }`}
                      />
                      <p
                        className={`text-xs pt-1 ${
                          tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'
                        }`}
                      >
                        {t('frases.analyzing', 'Analisando significado…')}
                      </p>
                    </div>
                  )}
                </section>
              ) : null}

              <dl
                className={`rounded-2xl border p-4 ${
                  tema === 'light'
                    ? 'border-purple-200/60 bg-white/60'
                    : 'border-zinc-600/40 bg-zinc-800/35'
                }`}
              >
                <MetaRow label={t('frases.detail.main_theme')} value={labelFor(primaryTheme)} tema={tema} />
                <MetaRow label={t('frases.detail.main_category')} value={labelFor(normalizedCategory)} tema={tema} />
                <MetaRow label={t('frases.detail.original_language')} value={originalLanguageName} tema={tema} />
                <MetaRow label={t('frases.detail.year')} value={frase.ano_ou_data} tema={tema} />
                <MetaRow label={t('frases.detail.nationality')} value={frase.nacionalidade} tema={tema} />
                <MetaRow label={t('frases.detail.birth_death')} value={frase.nascimento_falecimento} tema={tema} />
                <MetaRow label={t('frases.detail.author_type')} value={frase.autor_tipo} tema={tema} />
                <MetaRow label={t('frases.detail.sources')} value={frase.fontes} tema={tema} />
                <MetaRow label={t('frases.detail.note')} value={frase.observacao} tema={tema} />
                {frase.palavras_chave.length > 0 && (
                  <MetaRow label={t('frases.detail.keywords')} value={frase.palavras_chave.join(', ')} tema={tema} />
                )}
                {frase.informacoes?.ultima_atualizacao && (
                  <MetaRow label={t('frases.detail.last_updated')} value={frase.informacoes.ultima_atualizacao} tema={tema} />
                )}
                {frase.informacoes?.confiabilidade && (
                  <MetaRow label={t('frases.detail.reliability')} value={frase.informacoes.confiabilidade} tema={tema} />
                )}
              </dl>
            </div>
          ) : null}
        </div>
      </article>

      {relatedSlugs.length > 0 && (
        <nav
          className="mt-10"
          aria-label={t('frases.related', 'Frases relacionadas')}
        >
          <h2
            className={`text-[10px] font-black uppercase tracking-[0.35em] mb-4 ${
              tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            {t('frases.related', 'Frases relacionadas')}
          </h2>
          <ul className="space-y-2">
            {relatedSlugs.map((rel) => (
              <li key={rel.id}>
                <Link
                  to={frasePath(rel.slug, defaultLocale, defaultLocale)}
                  onMouseEnter={() => prefetchFraseDetail(rel.slug)}
                  onFocus={() => prefetchFraseDetail(rel.slug)}
                  className={`block text-sm leading-snug transition-colors hover:text-[#A855F7] ${
                    tema === 'light' ? 'text-zinc-700' : 'text-zinc-400'
                  }`}
                >
                  {labelFor(rel.titulo)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

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
