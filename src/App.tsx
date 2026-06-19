import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
const Terms = lazy(() => import('./views/Terms'));
const Privacy = lazy(() => import('./views/Privacy'));
const Contact = lazy(() => import('./views/Contact'));
const Cookies = lazy(() => import('./views/Cookies'));
import { 
  Copy, 
  Moon, 
  Sun, 
  Search, 
  BookOpen, 
  Quote, 
  Info, 
  MessageSquare, 
  Shield, 
  Share2, 
  ChevronRight,
  Maximize2,
  Minimize2,
  Download,
  CheckCircle2,
  AlertCircle,
  Instagram,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  ChevronLeft
} from 'lucide-react';

const ImageGeneratorModal = lazy(() => import('./components/image-generator'));
import { quoteFromItem } from './components/image-generator/utils/quoteFromItem';
import AdSlot from './components/AdSlot';
import { loadHomeBootstrap, ensureFullCatalogLoaded, type CatalogLoadResult } from './lib/homeData';
import { HOME_FRASE_POOL_SIZE, pathNeedsFullCatalog, sampleShuffled } from './lib/catalogLimits';
import PageTranslateButton from './components/PageTranslateButton';
import { usePageContentTranslate } from './hooks/usePageContentTranslate';
import { sanitizeTextForTranslation } from './lib/textSanitize';

const SocialHub = lazy(() => import('./components/SocialHub'));

function DeferredSocialHub({ tema }: { tema: string }) {
  return (
    <Suspense fallback={null}>
      <SocialHub tema={tema} />
    </Suspense>
  );
}
import {
  carregarMetaforaDetalhe,
  encontrarMetaforaNoBanco,
  filtrarMetaforasDoBanco,
  sanitizarIdMetafora,
} from './lib/metaforasLoader';
import {
  DEFAULT_DESCRIPTION,
  OG_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
  absoluteUrl,
  WEB_SITE_JSON_LD,
  urlMetafora,
} from './lib/seo';
import { buildTagRegistry, pathFromTag } from './lib/tagsSeo';
import { SEO_LOCALES } from './lib/i18nRoutes';
import { useDebouncedSupabaseSearch } from './hooks/useDebouncedSupabaseSearch';
import { searchBancoSemantico } from './lib/semanticSearch';
import { sanitizeContentBanco } from './lib/safeContent';
const TagCategoriaView = lazy(() => import('./views/TagCategoria'));
const FraseDetalheView = lazy(() => import('./views/FraseDetalhe'));
const FraseRedirectById = lazy(() => import('./views/FraseRedirectById'));
import {
  buildFeedWithAds,
  FEED_INITIAL_VISIBLE,
  FEED_LOAD_MORE_STEP,
} from './lib/feedWithAds';
import FeedGridWithAds from './components/FeedGridWithAds';
import FeedLoadMoreButton from './components/FeedLoadMoreButton';
import { normalizarParaSlug } from './lib/slug';
import type { ItemConteudo } from './types/content';
import ContentCard from './components/ContentCard';
import CardTooltip from './components/CardTooltip';
import { CARD_ACTION_BTN, cardNeutralActionClass } from './lib/cardTheme';
import { useTheme } from './context/ThemeContext';
import { UiLocaleSync } from './hooks/useUiLocaleSync';
import AnalyticsRouteSync from './components/AnalyticsRouteSync';
import { tagsForDisplay } from './lib/tagDisplay';
import BackNavButton from './components/BackNavButton';
import HeaderBrandLink from './components/HeaderBrandLink';
import { useAppUiReset } from './hooks/useAppUiReset';
import { dispatchAppUiReset } from './lib/appUiReset';

interface ModalProps {
  item: ItemConteudo;
  onClose: () => void;
}

// --- CONFIGURA�!ÒO DE FRASES LOADING ---
const FRASES_MOTIVACIONAIS_LOADING = [
  "A sabedoria não está em reter o conhecimento, mas em compartilhá-lo.",
  "Preparando uma dose de inspiração para transformar o dia de alguém...",
  "Grandes ideias merecem formatos incríveis. Quase pronto!",
  "A metamensagem certa pode ser a chave para mudar uma atitude hoje.",
  "Eternizando palavras de impacto em um design premium..."
];

// --- APP PRINCIPAL ---
export default function App() {
  const { t, i18n } = useTranslation();
  const { tema, toggleTema } = useTheme();
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'info' | 'erro' } | null>(null);
  const [bancoTotal, setBancoTotal] = useState<ItemConteudo[]>([]);
  const [bancoRandom, setBancoRandom] = useState<ItemConteudo[]>([]);
  const [tagsBootstrap, setTagsBootstrap] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogReady, setCatalogReady] = useState(false);

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'info' | 'erro' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  // Home: bootstrap leve; catálogo completo em idle (O(1) inicial)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const boot = await loadHomeBootstrap();
        if (cancelled) return;
        setBancoTotal(boot.items);
        setBancoRandom(
          sampleShuffled(
            boot.items.filter((i) => i.tipo === 'frase'),
            HOME_FRASE_POOL_SIZE
          )
        );
        setTagsBootstrap(boot.tags);
      } catch (e) {
        console.error('Falha ao carregar home-bootstrap', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyFullCatalog = useCallback((full: CatalogLoadResult) => {
    setBancoTotal(full.items);
    setBancoRandom(
      sampleShuffled(
        full.items.filter((i) => i.tipo === 'frase'),
        HOME_FRASE_POOL_SIZE
      )
    );
    setTagsBootstrap(full.tags);
    setCatalogReady(true);
  }, []);

  const requestFullCatalog = useCallback(() => {
    ensureFullCatalogLoaded()
      .then(applyFullCatalog)
      .catch((e) => console.warn('Catálogo:', e));
  }, [applyFullCatalog]);

  const tagRegistry = useMemo(
    () => (bancoTotal.length ? buildTagRegistry(bancoTotal) : []),
    [bancoTotal]
  );

  const tagsUnicas = useMemo(() => {
    const fromRegistry = tagRegistry.map((r) => r.tag);
    return fromRegistry.length ? fromRegistry : tagsBootstrap;
  }, [tagRegistry, tagsBootstrap]);

  return (
    <BrowserRouter>
      <CatalogRouteSync applyCatalog={applyFullCatalog} />
      <UiLocaleSync />
      <AnalyticsRouteSync />
      {/* Layout raiz (equiv. app/layout.tsx): script global AdSense Auto Ads */}
      <div className="min-h-screen mm-app-shell flex flex-col font-sans">
        {/* TOAST SYSTEM PREMIUM */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] pointer-events-none"
            >
              <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-xl border border-white/10 ${
                toast.tipo === 'sucesso' ? 'bg-emerald-500/90 text-white' : 
                toast.tipo === 'erro' ? 'bg-rose-500/90 text-white' : 
                'bg-purple-600/90 text-white'
              }`}>
                {toast.tipo === 'sucesso' && <CheckCircle2 size={18} />}
                {toast.tipo === 'erro' && <AlertCircle size={18} />}
                {toast.tipo === 'info' && <Info size={18} />}
                <span className="text-sm font-bold tracking-tight">{toast.mensagem}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEO GLOBAL DIN�MICO BASE */}
        <MudarMetaSEO
          title={t('app.title')}
          description={DEFAULT_DESCRIPTION}
        />

        {/* HEADER FIXO */}
        <header className="sticky top-0 mm-app-chrome border-b select-none backdrop-blur-md mm-header-bar">
          <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
              <HeaderBrandLink />

            <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-400">
            </nav>

            <div className="flex items-center gap-2 md:gap-4">
              <PageTranslateButton tema={tema} accent="purple" variant="header" />
              <button
                type="button"
                onClick={toggleTema}
                aria-label={tema === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
                className={`p-2.5 rounded-2xl border transition-transform hover:scale-110 ${
                  tema === 'light' ? 'bg-white border-purple-200 text-[#FACC15]' : 'bg-zinc-900 border-purple-500/30 text-[#60A5FA]'
                }`}
              >
                {tema === 'light' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* HUB SOCIAL (UNIVERSAL) */}
        <div className="border-b border-purple-500/5">
          <DeferredSocialHub tema={tema} />
        </div>

        {/* SUBHEADER DE NAVEGA�!ÒO REFOR�!ADA */}
        <div className="py-4 border-b sticky top-20 mm-app-subchrome backdrop-blur-md mm-subheader-bar border-purple-900/20">
          <div className="max-w-5xl mx-auto px-4 flex justify-center gap-12 md:gap-20">
            <Link
              to="/frases"
              aria-label={t('nav.access_quotes')}
              onClick={() => dispatchAppUiReset()}
              className={`text-[11px] font-black uppercase tracking-[0.4em] transition-transform flex items-center gap-2.5 ${tema === 'light' ? 'text-purple-600' : 'text-purple-400'} hover:scale-105 active:scale-95`}
            >
              <div className="w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
              {t('nav.access_quotes', t('nav.quotes'))}
            </Link>
            <Link
              to="/metaforas"
              onClick={() => dispatchAppUiReset()}
              className={`text-[11px] font-black uppercase tracking-[0.4em] transition-all flex items-center gap-2.5 ${tema === 'light' ? 'text-purple-600' : 'text-purple-400'} hover:scale-105 active:scale-95`}
            >
              <div className="w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
              {t('nav.metaforas')}
            </Link>
          </div>
        </div>

        {/* ROTAS DA APLICA�!ÒO */}
        <main id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center" role="status" aria-live="polite">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-mono text-[10px] uppercase tracking-widest opacity-40">{t('home.sharing_wisdom')}</p>
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <Routes>
                <Route
                  path="/"
                  element={
                    <HomeView
                      tema={tema}
                      toast={mostrarToast}
                      banco={bancoTotal}
                      bancoRandom={bancoRandom}
                      onRequestCatalog={requestFullCatalog}
                    />
                  }
                />
                <Route
                  path="/frases"
                  element={
                    <FrasesView
                      tema={tema}
                      toast={mostrarToast}
                      banco={bancoTotal}
                      catalogReady={catalogReady}
                      onRequestCatalog={requestFullCatalog}
                    />
                  }
                />
                <Route path="/f/:id" element={<FraseRedirectById />} />
                <Route path="/frases/:slug" element={<FraseDetalheView tema={tema} toast={mostrarToast} />} />
                {SEO_LOCALES.map((lang) => (
                  <Route
                    key={lang}
                    path={`/${lang}/frases/:slug`}
                    element={<FraseDetalheView tema={tema} toast={mostrarToast} />}
                  />
                ))}
                <Route path="/metaforas" element={<MetaforasView tema={tema} toast={mostrarToast} banco={bancoTotal} />} />
                <Route path="/metafora/:id/*" element={<MetaforaDetalheView tema={tema} banco={bancoTotal} toast={mostrarToast} />} />
                <Route path="/sobre" element={<Contact tema={tema} />} />
                <Route path="/contato" element={<Contact tema={tema} />} />
                <Route path="/privacidade" element={<Privacy tema={tema} />} />
                <Route path="/termos" element={<Terms tema={tema} />} />
                <Route path="/cookies" element={<Cookies tema={tema} />} />
                <Route
                  path="/:tagSlug"
                  element={
                    <TagCategoriaView
                      tema={tema}
                      toast={mostrarToast}
                      banco={bancoTotal}
                      registry={tagRegistry}
                      AdBanner={AdSlot}
                      MudarMetaSEO={MudarMetaSEO}
                    />
                  }
                />
              </Routes>
            </Suspense>
          )}
        </main>

        {/* FOOTER */}
        <footer className={`py-8 text-center text-xs border-t mt-auto ${tema === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-zinc-950 border-zinc-700/70 text-zinc-300'}`}>
          <div className="flex justify-center flex-wrap gap-4 mb-3 font-semibold">
            <Link to="/sobre">{t('nav.about')}</Link>
            <Link to="/privacidade">{t('nav.privacy')}</Link>
            <Link to="/termos">{t('nav.terms')}</Link>
            <Link to="/cookies">{t('nav.cookies')}</Link>
          </div>
          <p>© 2025 Metamensagem.com. Todos os direitos reservados.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

// ===================================================
// COMPONENTES AUXILIARES
// ===================================================

/**
 * Zonas de conteúdo para AdSense Auto Ads (in-feed / in-page).
 * Detectadas em: HomeView, FrasesView, MetaforasView (a cada 6 cards), MetaforaDetalheView (rodapé).
 * Sem <ins> manual � o Google Auto Ads usa a estrutura da página; min-height reduz CLS.
 */
// COMPONENTE AUXILIAR SEO DIN�MICO
function MudarMetaSEO({
  title,
  description,
  jsonLD,
  canonical,
  ogType = 'website',
}: {
  title: string;
  description: string;
  jsonLD?: object;
  canonical?: string;
  ogType?: string;
}) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const siteTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const desc = description?.trim() || DEFAULT_DESCRIPTION;
    const canon =
      canonical ||
      absoluteUrl(`${window.location.pathname}${window.location.search || ''}`);
    const pageUrl = canon;

    document.title = siteTitle;

    const updateMeta = (name: string, content: string, attr = 'name') => {
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMeta('description', desc);
    updateMeta('robots', 'index, follow');

    updateMeta('og:title', siteTitle, 'property');
    updateMeta('og:description', desc, 'property');
    updateMeta('og:type', ogType, 'property');
    updateMeta('og:url', pageUrl, 'property');
    updateMeta('og:image', OG_IMAGE, 'property');
    updateMeta('og:site_name', SITE_NAME, 'property');
    updateMeta(
      'og:locale',
      i18n.language === 'pt'
        ? 'pt_BR'
        : i18n.language === 'es'
          ? 'es_ES'
          : i18n.language === 'fr'
            ? 'fr_FR'
            : 'en_US',
      'property'
    );

    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', siteTitle);
    updateMeta('twitter:description', desc);
    updateMeta('twitter:image', OG_IMAGE);

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canon);

    document
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((node) => node.remove());

    const idScript = 'jsonld-dinamico';
    let script = document.getElementById(idScript);
    if (script) script.remove();
    const payload = jsonLD ?? WEB_SITE_JSON_LD;
    script = document.createElement('script');
    script.id = idScript;
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);
  }, [title, description, jsonLD, canonical, ogType, i18n.language]);

  return null;
}

/** Carrega feed-sample só em rotas que precisam (evita parse de ~1,5 MB na home durante Lighthouse). */
function CatalogRouteSync({
  applyCatalog,
}: {
  applyCatalog: (full: CatalogLoadResult) => void;
}) {
  const location = useLocation();

  useEffect(() => {
    if (!pathNeedsFullCatalog(location.pathname)) return;
    let cancelled = false;
    ensureFullCatalogLoaded()
      .then((full) => {
        if (!cancelled) applyCatalog(full);
      })
      .catch((e) => console.warn('Catálogo (rota):', e));
    return () => {
      cancelled = true;
    };
  }, [location.pathname, applyCatalog]);

  return null;
}

// ===================================================
// VISÒO: HOME (CONSUMO DE INDEX)
// ===================================================
function HomeView({
  tema,
  toast,
  banco,
  bancoRandom,
  onRequestCatalog,
}: {
  tema: string;
  toast: any;
  banco: ItemConteudo[];
  bancoRandom: ItemConteudo[];
  onRequestCatalog?: () => void;
}) {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');
  const [itensVisiveis, setItensVisiveis] = useState(FEED_INITIAL_VISIBLE);

  useEffect(() => {
    if (busca.trim()) onRequestCatalog?.();
  }, [busca, onRequestCatalog]);
  const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);
  const closeImageModal = useCallback(() => setImageQuote(null), []);
  useAppUiReset(closeImageModal);
  const bancoFrases = useMemo(() => banco.filter((i) => i.tipo === 'frase'), [banco]);
  const bancoRandomFrases = useMemo(
    () => bancoRandom.filter((i) => i.tipo === 'frase'),
    [bancoRandom]
  );
  const tagsFrases = useMemo(
    () => tagsForDisplay(bancoFrases.flatMap((f) => f.tags || []), 12),
    [bancoFrases]
  );
  const {
    items: supabaseHits,
    active: supabaseActive,
    enabled: supabaseOn,
  } = useDebouncedSupabaseSearch(busca);
  const resultadosFiltrados = useMemo(() => {
    if (!busca.trim()) return bancoRandomFrases;
    if (supabaseActive && supabaseHits !== null) return supabaseHits;
    return searchBancoSemantico(bancoFrases, busca);
  }, [busca, bancoFrases, bancoRandomFrases, supabaseOn, supabaseActive, supabaseHits]);

  const itensHome = useMemo(
    () =>
      buildFeedWithAds(resultadosFiltrados, itensVisiveis, (content) => ({
        tipoItem: 'conteudo',
        content,
      })),
    [resultadosFiltrados, itensVisiveis]
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 flex flex-col"
    >
      <MudarMetaSEO
        title={t('app.tagline')}
        description={DEFAULT_DESCRIPTION}
        canonical={SITE_ORIGIN}
      />

      <section className="text-center pt-2 pb-6 md:pt-4 md:pb-8">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl md:text-7xl font-black mb-3 tracking-tighter leading-none"
        >
          {t('app.tagline_before')} <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF]">
            {t('app.tagline_highlight')}
          </span>
        </motion.h1>
        <p
          className={`text-sm md:text-[15px] font-medium tracking-wide max-w-md mx-auto mb-8 ${
            tema === 'light' ? 'text-zinc-500' : 'text-zinc-400/90'
          }`}
        >
          {t('app.slogan')}
        </p>

        <div className="relative max-w-2xl mx-auto">
          <Search className={`absolute left-6 top-1/2 -translate-y-1/2 ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`} size={20} />
          <input
            type="text"
            placeholder={t('home.search_placeholder')}
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setItensVisiveis(FEED_INITIAL_VISIBLE);
            }}
            className={`w-full py-5 pl-14 pr-6 rounded-[2rem] border-2 font-medium outline-none transition-all shadow-xl ${
              tema === 'light'
                ? 'bg-white border-zinc-100 text-black focus:border-[#A855F7] shadow-zinc-200'
                : 'bg-zinc-900 border-zinc-800 text-white focus:border-[#A855F7] shadow-black/50'
            }`}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-2xl mx-auto">
          {tagsFrases.map((tag) => (
            <Link
              key={tag}
              to={pathFromTag(tag)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                tema === 'light'
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:border-[#A855F7] hover:text-[#A855F7]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-[#A855F7] hover:text-[#A855F7]'
              }`}
            >
              #{tag}
            </Link>
          ))}
        </div>
      </section>

      <FeedGridWithAds
        rows={itensHome}
        tema={tema}
        placement="home-in-feed"
        renderCard={(item, index) => (
          <ContentCard
            item={item}
            tema={tema}
            toast={toast}
            onGenerateImage={
              item.tipo === 'frase' ? (quote) => setImageQuote(quote) : undefined
            }
            lazyBelowFold={index >= 3}
          />
        )}
      />

      {resultadosFiltrados.length > itensVisiveis && (
        <FeedLoadMoreButton onClick={() => setItensVisiveis((p) => p + FEED_LOAD_MORE_STEP)} />
      )}

      <DeferredSocialHub tema={tema} />

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
    </motion.div>
  );
}

/** Contador discreto abaixo do título (coleção / filtro ativo). */
function ColecaoContador({
  tema,
  mode = 'numeric',
  total = 0,
  visiveis,
  buscaAtiva,
  singular,
  plural,
  volumeKey = 'frases.volume_static',
}: {
  tema: string;
  mode?: 'volume' | 'numeric';
  total?: number;
  visiveis?: number;
  buscaAtiva?: boolean;
  singular?: string;
  plural?: string;
  volumeKey?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('pt') ? 'pt-BR' : i18n.language || 'en';
  const fmt = (n: number) => n.toLocaleString(locale);

  let displayText: string;
  if (mode === 'volume') {
    const volumeLabel = t(volumeKey);
    displayText =
      buscaAtiva && visiveis !== undefined
        ? `${fmt(visiveis)} · ${volumeLabel}`
        : volumeLabel;
  } else {
    const rotulo = total === 1 ? singular : plural;
    displayText =
      buscaAtiva && visiveis !== undefined && visiveis !== total
        ? t('frases.count_filtered', {
            visible: fmt(visiveis),
            count: fmt(total),
            label: rotulo ?? '',
          })
        : t('frases.count_available', { count: fmt(total), label: rotulo ?? '' });
  }

  return (
    <p
      className={`text-sm md:text-[15px] font-medium tracking-wide mb-6 -mt-2 ${
        tema === 'light' ? 'text-zinc-500/80' : 'text-zinc-400/75'
      }`}
      aria-live="polite"
    >
      {displayText}
    </p>
  );
}

// ===================================================
// VISÒO: LISTA DE FRASES
// ===================================================
function FrasesView({
  tema,
  toast,
  banco,
  catalogReady,
  onRequestCatalog,
}: {
  tema: string;
  toast: (msg: string, tipo?: 'sucesso' | 'info' | 'erro') => void;
  banco: ItemConteudo[];
  catalogReady: boolean;
  onRequestCatalog?: () => void;
}) {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');
  const [itensVisiveis, setItensVisiveis] = useState(FEED_INITIAL_VISIBLE);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    onRequestCatalog?.();
  }, [onRequestCatalog]);

  useEffect(() => {
    if (catalogReady) {
      setCatalogLoading(false);
      return;
    }
    setCatalogLoading(true);
  }, [catalogReady]);

  const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);
  const closeImageModal = useCallback(() => setImageQuote(null), []);
  useAppUiReset(closeImageModal);
  const baseFrases = useMemo(() => {
    const list = banco.filter((i) => i.tipo === 'frase');
    return sampleShuffled(list, list.length);
  }, [banco]);

  const {
    items: supabaseHits,
    active: supabaseActive,
    enabled: supabaseOn,
  } = useDebouncedSupabaseSearch(busca);

  const frases = useMemo(() => {
    if (!busca.trim()) return baseFrases;
    if (supabaseActive && supabaseHits !== null) return supabaseHits;
    return searchBancoSemantico(baseFrases, busca);
  }, [busca, baseFrases, supabaseOn, supabaseActive, supabaseHits]);

  useEffect(() => {
    setItensVisiveis(FEED_INITIAL_VISIBLE);
  }, [busca]);

  const tags = useMemo(
    () => tagsForDisplay(baseFrases.flatMap((f) => f.tags || []), 10),
    [baseFrases]
  );

  const itensFrases = useMemo(
    () =>
      buildFeedWithAds(frases, itensVisiveis, (content) => ({
        tipoItem: 'conteudo',
        content,
      })),
    [frases, itensVisiveis]
  );

  return (
    <div className="max-w-7xl w-full mx-auto px-4 py-8 flex-1">
      <MudarMetaSEO
        title={t('frases.page_title')}
        description={t('frases.page_description')}
        canonical={absoluteUrl('/frases')}
      />
      
      <div className="text-center mb-12">
        <h1 className="text-3xl font-black mb-2 uppercase tracking-widest text-[#A855F7] flex items-center justify-center gap-3">
          <Quote aria-hidden /> {t('frases.collection_title')}
        </h1>
        <ColecaoContador
          tema={tema}
          mode="volume"
          visiveis={frases.length}
          buscaAtiva={!!busca.trim()}
        />
        <div className="relative max-w-xl mx-auto">
          <Search className={`absolute left-6 top-1/2 -translate-y-1/2 ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`} size={18} />
          <input 
            type="text" 
            placeholder={t('frases.search_placeholder')}
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setItensVisiveis(FEED_INITIAL_VISIBLE);
            }}
            className={`w-full py-4 pl-14 pr-6 rounded-2xl border-2 font-medium outline-none transition-all ${
              tema === 'light' ? 'bg-white border-zinc-100 text-black focus:border-[#A855F7]' : 'bg-zinc-900 border-zinc-800 text-white focus:border-[#A855F7]'
            }`}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setBusca(tag)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                busca === tag
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : tema === 'light'
                    ? 'bg-zinc-500/5 text-zinc-500 border-zinc-500/10 hover:border-zinc-500/30'
                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-600/35 hover:border-purple-500/40'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {catalogLoading && baseFrases.length === 0 ? (
        <div className="flex justify-center py-16" role="status" aria-live="polite">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
      <FeedGridWithAds
        rows={itensFrases}
        tema={tema}
        placement="frases-in-feed"
        renderCard={(item, index) => (
          <ContentCard
            item={item}
            tema={tema}
            toast={toast}
            onGenerateImage={(quote) => setImageQuote(quote)}
            lazyBelowFold={index >= FEED_INITIAL_VISIBLE}
          />
        )}
      />
      )}

      {frases.length > itensVisiveis && (
        <FeedLoadMoreButton onClick={() => setItensVisiveis((p) => p + FEED_LOAD_MORE_STEP)} />
      )}
      
      <DeferredSocialHub tema={tema} />

      {imageQuote && (
        <ImageGeneratorModal
          open
          quote={imageQuote}
          onClose={closeImageModal}
          toast={toast}
          tema={tema}
        />
      )}
    </div>
  );
}

// ===================================================
// VISÒO: LISTA DE METÁFORAS
// ===================================================
function MetaforasView({ tema, toast, banco }: { tema: string; toast: any; banco: ItemConteudo[] }) {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');
  const [itensVisiveis, setItensVisiveis] = useState(FEED_INITIAL_VISIBLE);
  const baseMetaforas = useMemo(() => filtrarMetaforasDoBanco(banco), [banco]);

  const metaforas = useMemo(() => {
    if (!busca.trim()) return baseMetaforas;
    return searchBancoSemantico(baseMetaforas, busca);
  }, [busca, baseMetaforas]);

  useEffect(() => {
    setItensVisiveis(FEED_INITIAL_VISIBLE);
  }, [busca]);

  const tags = useMemo(
    () => tagsForDisplay(baseMetaforas.flatMap((m) => m.tags || []), 10),
    [baseMetaforas]
  );

  const itensMetaforas = useMemo(
    () =>
      buildFeedWithAds(metaforas, itensVisiveis, (content) => ({
        tipoItem: 'conteudo',
        content,
      })),
    [metaforas, itensVisiveis]
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl w-full mx-auto px-4 py-8 flex-1"
    >
      <MudarMetaSEO
        title={t('metaforas.page_title')}
        description={t('metaforas.page_description')}
        canonical={absoluteUrl('/metaforas')}
      />
      
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black mb-2 uppercase tracking-widest text-[#A855F7] flex items-center justify-center gap-3">
          <BookOpen /> {t('metaforas.collection_title')}
        </h2>
        <ColecaoContador
          tema={tema}
          mode="volume"
          volumeKey="metaforas.volume_static"
          visiveis={metaforas.length}
          buscaAtiva={!!busca.trim()}
        />
        <div className="relative max-w-xl mx-auto">
          <Search className={`absolute left-6 top-1/2 -translate-y-1/2 ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`} size={18} />
          <input 
            type="text" 
            placeholder={t('metaforas.search_placeholder')}
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setItensVisiveis(FEED_INITIAL_VISIBLE);
            }}
            className={`w-full py-4 pl-14 pr-6 rounded-2xl border-2 font-medium outline-none transition-all ${
              tema === 'light' ? 'bg-white border-zinc-100 text-black focus:border-[#A855F7]' : 'bg-zinc-900 border-zinc-800 text-white focus:border-[#A855F7]'
            }`}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {tags.map(tag => (
            <button key={tag} onClick={() => setBusca(tag)} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${busca === tag ? 'bg-purple-600 border-purple-600 text-white' : tema === 'light' ? 'bg-zinc-500/5 text-zinc-500 border-zinc-500/10 hover:border-zinc-500/30' : 'bg-zinc-800/50 text-zinc-400 border-zinc-600/35 hover:border-purple-500/40'}`}>#{tag}</button>
          ))}
        </div>
      </div>

      <FeedGridWithAds
        rows={itensMetaforas}
        tema={tema}
        placement="metaforas-in-feed"
        renderCard={(item, index) => (
          <ContentCard
            item={item}
            tema={tema}
            toast={toast}
            lazyBelowFold={index >= FEED_INITIAL_VISIBLE}
          />
        )}
      />

      {metaforas.length > itensVisiveis && (
        <FeedLoadMoreButton onClick={() => setItensVisiveis((p) => p + FEED_LOAD_MORE_STEP)} />
      )}

      <DeferredSocialHub tema={tema} />
    </motion.div>
  );
}

// VISÒO: DETALHE DA METÁFORA (CARREGAMENTO DIN�MICO ESTRUTURADO)
// ===================================================
function MetaforaDetalheView({ tema, banco, toast }: { tema: string; banco: ItemConteudo[]; toast: any }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const [fontSize, setFontSize] = useState(20);
  const [item, setItem] = useState<ItemConteudo | null>(null);
  const [loading, setLoading] = useState(true);

  const contentSource = useMemo(
    () => ({
      texto: item?.texto || '',
      titulo: item?.titulo,
      resumo: item?.resumo,
      autor: item?.autor,
    }),
    [item?.id, item?.texto, item?.titulo, item?.resumo, item?.autor]
  );

  const { display } = usePageContentTranslate({
    id: item ? `metafora-${item.id}` : 'metafora-detail',
    source: contentSource,
  });

  const navigation = useMemo(() => {
    if (!id || banco.length === 0) return { prev: null, next: null };
    const metaforas = filtrarMetaforasDoBanco(banco);
    const idNorm = sanitizarIdMetafora(id);
    const idx = metaforas.findIndex(
      (m) => sanitizarIdMetafora(m.id) === idNorm
    );
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? metaforas[idx - 1] : null,
      next: idx < metaforas.length - 1 ? metaforas[idx + 1] : null
    };
  }, [id, banco]);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;
    setLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    carregarMetaforaDetalhe(id).then((detalhe) => {
      if (cancelado) return;
      if (detalhe) {
        setItem(detalhe as ItemConteudo);
      } else {
        const doBanco = encontrarMetaforaNoBanco(banco, id);
        setItem(
          doBanco
            ? ({ ...doBanco, tipo: 'metafora' } as ItemConteudo)
            : null
        );
      }
      setLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, [id, banco]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-40">
          {t('metaforas.loading', 'Extraindo Sabedoria do Fragmento...')}
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-20 text-center text-red-500">
        {t('metaforas.not_found', 'Metáfora não localizada no fragmento de borda.')}
      </div>
    );
  }

  const palavras = item.texto ? item.texto.split(/\s+/).length : 0;
  const tempoLeitura = Math.ceil(palavras / 200);

  const canonicalUrl = urlMetafora(item.id, item.titulo);
  const jsonLD = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: item.titulo,
    description: item.resumo,
    abstract: item.resumo,
    articleBody: item.texto?.substring(0, 5000),
    author: { '@type': 'Person', name: item.autor || 'Anônimo' },
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: OG_IMAGE,
    },
    inLanguage: 'pt-BR',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl w-full mx-auto px-4 py-12 flex-1"
    >
      <MudarMetaSEO
        title={item.titulo || t('metaforas.fallback_title', 'Metáfora terapêutica')}
        description={item.resumo || DEFAULT_DESCRIPTION}
        canonical={canonicalUrl}
        ogType="article"
        jsonLD={jsonLD}
      />
      
      <div className={`mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-10 ${tema === 'light' ? 'border-zinc-200' : 'border-zinc-800'}`}>
        <div className="flex-1">
          <BackNavButton
            label={t('metaforas.therapeutic_title', 'Metáfora Terapêutica')}
            fallbackPath="/metaforas"
            className="text-[10px] uppercase font-black text-[#A855F7] tracking-[0.2em] mb-4 inline-flex items-center gap-2 hover:gap-3 transition-[gap] bg-transparent border-0 p-0 cursor-pointer"
          />
          <AnimatePresence mode="wait">
            <motion.h1
              key={(display.titulo ?? item.titulo) + String(display.isTranslated)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`text-4xl md:text-6xl font-black mb-4 tracking-tighter leading-tight ${tema === 'light' ? 'text-black' : 'text-white'}`}
            >
              {display.titulo ?? item.titulo}
            </motion.h1>
          </AnimatePresence>
          <div className={`flex items-center gap-4 text-xs font-bold ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${tema === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
              <BookOpen size={14} /> {t('metaforas.read_time', '~{{count}} MIN DE REFLEXÃO', { count: tempoLeitura })}
            </span>
            <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${tema === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
              <Quote size={14} /> {t('metaforas.wisdom_badge', 'SABEDORIA SECULAR')}
            </span>
          </div>
        </div>
        <div className={`flex gap-2 p-2 rounded-[1.5rem] border ${tema === 'light' ? 'bg-white border-zinc-100' : 'bg-zinc-900 border-white/5'}`}>
          <button onClick={() => setFontSize(p => Math.max(12, p - 4))} className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-colors ${tema === 'light' ? 'bg-zinc-100 hover:bg-zinc-200' : 'bg-black hover:bg-zinc-800'}`}><Minimize2 size={16} /></button>
          <button onClick={() => setFontSize(p => Math.min(48, p + 4))} className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-colors ${tema === 'light' ? 'bg-zinc-100 hover:bg-zinc-200' : 'bg-black hover:bg-zinc-800'}`}><Maximize2 size={16} /></button>
        </div>
      </div>

      <article
        className={`whitespace-pre-wrap leading-[1.8] tracking-tight font-medium transition-all max-w-none prose ${tema === 'light' ? 'text-[#000000] prose-zinc' : 'text-zinc-300 prose-invert'}`}
        style={{ fontSize: `${fontSize}px` }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={display.texto + String(display.isTranslated)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="opacity-100"
          >
            {sanitizeTextForTranslation(display.texto) || item.texto}
          </motion.div>
        </AnimatePresence>
      </article>

       <div className={`mt-16 py-10 border-t flex flex-col items-center ${tema === 'light' ? 'border-zinc-200' : 'border-zinc-700/70'}`}>
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#A855F7] to-transparent mb-8"></div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#EC4899]"></div>
          <span className="text-2xl font-black text-[#EC4899] text-center italic tracking-widest">{item.autor.toUpperCase()}</span>
        </div>
        <div className="flex gap-2 mt-6 items-end justify-center min-h-[3.375rem]">
          <CardTooltip text={t('common.copy')} tema={tema}>
            <button
              type="button"
              onClick={() => {
                const titulo = display.titulo ?? item.titulo;
                const texto = display.texto || item.texto;
                navigator.clipboard.writeText(`${titulo}\n\n${texto}\n— ${item.autor}`);
                toast(t('common.copied'));
              }}
              className={`${CARD_ACTION_BTN} ${cardNeutralActionClass(tema)}`}
            >
              <Copy size={18} />
            </button>
          </CardTooltip>
          <CardTooltip text={t('translate_page.button_short', 'Traduzir página')} tema={tema}>
            <PageTranslateButton tema={tema} accent="pink" variant="pill" />
          </CardTooltip>
          <CardTooltip text={t('common.share')} tema={tema}>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href);
                toast(t('common.link_copied'));
              }}
              className={`${CARD_ACTION_BTN} ${cardNeutralActionClass(tema)}`}
            >
              <Share2 size={18} />
            </button>
          </CardTooltip>
        </div>
      </div>

       <DeferredSocialHub tema={tema} />

      {/* NAVEGA�!ÒO ENTRE METAFORAS */}
      <div className="mt-12 flex flex-col sm:flex-row justify-between gap-4">
        {navigation.prev ? (
          <Link 
            to={`/metafora/${navigation.prev.id}/${normalizarParaSlug(navigation.prev.titulo || '')}`}
            className={`flex-1 flex items-center gap-3 p-5 rounded-3xl border transition-all ${tema === 'light' ? 'bg-white border-zinc-100 hover:bg-zinc-50' : 'bg-zinc-800/40 border-zinc-600/30 hover:bg-zinc-800/70'}`}
          >
            <ChevronLeft size={16} className="text-purple-500 shrink-0" />
            <div className="text-left overflow-hidden">
              <span className={`text-[8px] font-black uppercase block mb-1 ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {t('metaforas.prev', 'Anterior')}
              </span>
              <span className="text-xs font-bold truncate block leading-tight">{navigation.prev.titulo}</span>
            </div>
          </Link>
        ) : <div className="flex-1 hidden sm:block" />}
        
        {navigation.next ? (
          <Link 
            to={`/metafora/${navigation.next.id}/${normalizarParaSlug(navigation.next.titulo || '')}`}
            className={`flex-1 flex items-center justify-end gap-3 p-5 rounded-3xl border transition-all ${tema === 'light' ? 'bg-white border-zinc-100 hover:bg-zinc-50' : 'bg-zinc-800/40 border-zinc-600/30 hover:bg-zinc-800/70'}`}
          >
            <div className="text-right overflow-hidden">
              <span className={`text-[8px] font-black uppercase block mb-1 ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {t('metaforas.next', 'Próxima')}
              </span>
              <span className="text-xs font-bold truncate block leading-tight">{navigation.next.titulo}</span>
            </div>
            <ChevronRight size={16} className="text-purple-500 shrink-0" />
          </Link>
        ) : <div className="flex-1 hidden sm:block" />}
      </div>
      
      <div className="mt-12">
        <AdSlot tema={tema} placement="metafora-detail-footer" />
      </div>
    </motion.div>
  );
}





