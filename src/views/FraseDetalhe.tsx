import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
const ImageGeneratorModal = lazy(() => import('../components/image-generator'));
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Copy, Share2, Sparkles } from 'lucide-react';
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
  fraseToListItem,
  type FraseCms,
} from '../lib/frasesModel';
import { pathFromTag } from '../lib/tagsSeo';
import {
  fraseCanonicalUrl,
  fraseHreflangAlternates,
  htmlLangAttribute,
  parseFraseRoute,
  resolveFraseContentLocale,
  seoLocaleFromLanguageOriginal,
} from '../lib/i18nRoutes';
import { availableLanguagesFromMeta, loadFraseI18nMeta } from '../lib/globalSeoClient';
import { pickTitleDescription } from '../../lib/seo/i18nTemplates';
import { useTranslatedViewMeta } from '../lib/useTranslatedViewMeta';
import { SEO_LOCALES } from '../lib/i18nRoutes';
import { applyHreflangLinks } from '../lib/seoHreflang';
import type { SeoLocale } from '../../lib/i18n/locales';
import type { ItemConteudo } from '../types/content';

function MudarMetaSEO({
  title,
  description,
  canonical,
  hreflangLinks,
  htmlLang,
}: {
  title: string;
  description: string;
  canonical: string;
  hreflangLinks: { hreflang: string; href: string }[];
  htmlLang: string;
}) {
  useEffect(() => {
    const prevLang = document.documentElement.lang;
    document.documentElement.lang = htmlLang;
    document.title = title.includes('Metamensagem') ? title : `${title} | Metamensagem`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', description);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;
    applyHreflangLinks(hreflangLinks);
    return () => {
      document.documentElement.lang = prevLang;
    };
  }, [title, description, canonical, hreflangLinks, htmlLang]);

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
  const routeInfo = useMemo(() => parseFraseRoute(location.pathname), [location.pathname]);
  const { t, i18n } = useTranslation();
  const [i18nMeta, setI18nMeta] = useState<Awaited<ReturnType<typeof loadFraseI18nMeta>>>(null);
  const [frase, setFrase] = useState<FraseCms | null>(() =>
    slug ? getFraseCmsBySlugSync(slug) ?? null : null
  );
  const [loading, setLoading] = useState(!frase);
  const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);
  const [display, setDisplay] = useState<CardContentDisplay>({
    texto: '',
    isTranslated: false,
  });
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    (async () => {
      const [fromShard, meta] = await Promise.all([
        loadFraseDetailBySlug(slug),
        loadFraseI18nMeta(slug),
      ]);
      if (cancel) return;
      if (meta) setI18nMeta(meta);
      if (fromShard) {
        setFrase(fromShard);
        setLoading(false);
        return;
      }
      const sync = getFraseCmsBySlugSync(slug);
      setFrase(sync ?? null);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [slug]);

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
    setDisplay({ texto: frase.frase_original, isTranslated: false });
  }, [frase?.id, frase?.frase_original]);

  const listItem = useMemo(() => (frase ? fraseToListItem(frase) : null), [frase]);

  const translateSource = useMemo(
    () => (frase ? { texto: frase.frase_original } : { texto: '' }),
    [frase]
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
  const quoteText = display.texto || frase?.frase_original || '';
  const authorLine = display.autor || frase?.autor_original || '';
  useTranslatedViewMeta(display.isTranslated);

  const handleCopy = () => {
    if (!frase) return;
    navigator.clipboard.writeText(`${quoteText} — ${authorLine}`);
    toast(t('common.copied'));
  };

  const handleShare = async () => {
    if (!frase) return;
    const shareUrl = canonical;
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
    await navigator.clipboard.writeText(shareUrl);
    toast(t('common.link_copied'));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-20">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!frase || !listItem) {
    return (
      <div className="p-20 text-center text-red-400">
        Frase não encontrada.{' '}
        <Link to="/frases" className="text-purple-400 underline">
          Voltar às frases
        </Link>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl w-full mx-auto px-4 py-10 flex-1"
    >
      <MudarMetaSEO
        title={seoPack.title}
        description={seoPack.description}
        canonical={canonical}
        hreflangLinks={hreflangLinks}
        htmlLang={pageHtmlLang}
      />

      <nav className="sr-only" aria-label="Idiomas">
        {hreflangLinks.map((l) => (
          <a key={l.hreflang} href={l.href} hrefLang={l.hreflang}>
            {l.hreflang}
          </a>
        ))}
      </nav>

      <Link
        to="/frases"
        className="text-[10px] uppercase font-black text-[#A855F7] tracking-[0.2em] mb-6 inline-flex items-center gap-2 hover:gap-3 transition-all"
      >
        <ChevronLeft size={14} /> {t('nav.frases', 'Frases')}
      </Link>

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

            <AnimatePresence mode="wait">
              <motion.blockquote
                key={quoteText + String(display.isTranslated)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`text-3xl md:text-4xl font-black leading-[1.15] tracking-tight mb-5 transition-opacity ${
                  translating ? 'opacity-55' : 'opacity-100'
                } ${tema === 'light' ? 'text-black' : 'text-white'}`}
              >
                &ldquo;{quoteText}&rdquo;
              </motion.blockquote>
            </AnimatePresence>

            <p
              className={`text-sm font-bold tracking-wide mb-6 ${
                tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              — {authorLine}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-8">
              <Link
                to={pathFromTag(frase.categoria)}
                className={`text-[9px] font-black px-2.5 py-1 rounded-full border transition-colors ${cardTagClass('purple')}`}
              >
                #{frase.categoria.toUpperCase()}
              </Link>
              {frase.contextos.map((c) => (
                <Link
                  key={c}
                  to={pathFromTag(c)}
                  className={`text-[9px] font-black px-2.5 py-1 rounded-full border transition-colors ${cardTagClass('purple')}`}
                >
                  #{c.toUpperCase()}
                </Link>
              ))}
            </div>

            <div className="flex justify-end items-end gap-2 pt-6 border-t border-zinc-500/10 min-h-[3.375rem]">
              <CardTooltip text={t('common.copy')} tema={tema}>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`${CARD_ACTION_BTN} ${neutralAction}`}
                >
                  <Copy size={18} />
                </button>
              </CardTooltip>

              <CardTooltip text={t('common.share')} tema={tema}>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className={`${CARD_ACTION_BTN} ${neutralAction}`}
                >
                  <Share2 size={18} />
                </button>
              </CardTooltip>

              <CardTooltip text={t('common.translate')} tema={tema}>
                <CardTranslateMenu
                  tema={tema}
                  accent="purple"
                  contentId={frase.id}
                  source={
                    frase
                      ? {
                          texto: frase.frase_original,
                          autor: frase.autor_original,
                          explicacao: frase.explicacao ?? undefined,
                        }
                      : translateSource
                  }
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
                      locale,
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
            onClose={() => setImageQuote(null)}
            toast={toast}
            tema={tema}
          />
        </Suspense>
      )}
    </motion.div>
  );
}
