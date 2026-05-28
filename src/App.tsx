import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useLocation } from 'react-router-dom';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Terms from './views/Terms';
import Privacy from './views/Privacy';
import Contact from './views/Contact';
import Cookies from './views/Cookies';
import { 
  Copy, 
  Image as ImageIcon, 
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

import CustomModalGeradorPost from './components/ModalGeradorPost';
import { CardTranslateMenu } from './components/CardTranslateMenu';
import GoogleAdSense from './components/GoogleAdSense';
import { type CardContentDisplay } from './lib/translation';
import { sanitizeTextForTranslation } from './lib/textSanitize';

import SocialHub from './components/SocialHub';
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
  WEB_SITE_JSON_LD,
  urlMetafora,
} from './lib/seo';
import { buildTagRegistry, pathFromTag } from './lib/tagsSeo';
import { searchBancoSemantico } from './lib/semanticSearch';
import { sanitizeContentBanco } from './lib/safeContent';
import { pruneInvalidTranslationCache } from './lib/translation';
import TagCategoriaView from './views/TagCategoria';
import FraseDetalheView from './views/FraseDetalhe';
import { primeFrasesCms, fraseToListItem } from './lib/frasesModel';
import { GRID_CONTENT, renderContentCard } from './lib/contentGrid';

// --- TIPOS ---
interface ItemConteudo {
  id: string;
  tipo: 'frase' | 'metafora';
  texto: string;
  autor: string;
  tags: string[];
  slug?: string;
  titulo?: string;
  resumo?: string;
  imagem?: string;
}

async function montarBanco(metaforasRaw: unknown[], frasesRaw: unknown[]): Promise<ItemConteudo[]> {
  const metaforas = sanitizeContentBanco(metaforasRaw);
  try {
    const cmsRes = await fetch('/frases-cms.json');
    if (cmsRes.ok) {
      const cms = await cmsRes.json();
      primeFrasesCms(cms);
      const frases = cms.map(fraseToListItem) as ItemConteudo[];
      return [...metaforas, ...frases];
    }
  } catch {
    /* fallback índice */
  }
  return sanitizeContentBanco([...metaforas, ...frasesRaw]);
}

interface ModalProps {
  item: ItemConteudo;
  onClose: () => void;
}

// --- CONFIGURAÇÃO DE FRASES LOADING ---
const FRASES_MOTIVACIONAIS_LOADING = [
  "A sabedoria não está em reter o conhecimento, mas em compartilhá-lo.",
  "Preparando uma dose de inspiração para transformar o dia de alguém...",
  "Grandes ideias merecem formatos incríveis. Quase pronto!",
  "A metamensagem certa pode ser a chave para mudar uma atitude hoje.",
  "Eternizando palavras de impacto em um design premium..."
];

// --- AUXILIAR DE NORMALIZAÇÃO ---
const normalizarParaSlug = (texto: string) => {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

// --- APP PRINCIPAL ---
export default function App() {
  const { t, i18n } = useTranslation();
  const [tema, setTema] = useState<'light' | 'dark'>('dark');
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'info' | 'erro' } | null>(null);
  const [bancoTotal, setBancoTotal] = useState<ItemConteudo[]>([]);
  const [bancoRandom, setBancoRandom] = useState<ItemConteudo[]>([]);
  const [loading, setLoading] = useState(true);

  const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };
  
  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'info' | 'erro' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleTema = () => setTema(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    pruneInvalidTranslationCache();
  }, []);

  // Carregamento de Indexes (Arquitetura Performance + Offline-First)
  useEffect(() => {
    const carregarIndices = async () => {
      const CACHE_NAME = 'mm-data-v1';
      const urls = ['/metaforas-index.json', '/frases-index.json'];
      
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponses = await Promise.all(urls.map(url => cache.match(url)));
        
        let dataToSet: ItemConteudo[] = [];

        if (cachedResponses.every(res => res)) {
          const cachedData = await Promise.all(cachedResponses.map(res => res!.json()));
          dataToSet = await montarBanco(cachedData[0], cachedData[1]);
          setBancoTotal(dataToSet);
          setBancoRandom(shuffleArray(dataToSet));
          setLoading(false);
          console.log("⚡ Indices carregados do Cache Storage");
        }

        const networkResponses = await Promise.all(urls.map(url => fetch(url)));
        const clonedResponses = networkResponses.map(res => res.clone());
        const networkData = await Promise.all(networkResponses.map(res => res.json()));
        
        await Promise.all(clonedResponses.map((res, i) => cache.put(urls[i], res)));
        
        const finalData = await montarBanco(networkData[0], networkData[1]);
        setBancoTotal(finalData);
        if (dataToSet.length === 0) {
          setBancoRandom(shuffleArray(finalData));
        }
        console.log("🔄 Indices atualizados via Network");
      } catch (e) {
        console.error("Falha na sincronização Edge", e);
      } finally {
        setLoading(false);
      }
    };
    carregarIndices();
  }, []);

  const tagRegistry = useMemo(() => buildTagRegistry(bancoTotal), [bancoTotal]);

  const tagsUnicas = useMemo(() => {
    return tagRegistry.map((r) => r.tag);
  }, [tagRegistry]);

  return (
    <BrowserRouter>
      {/* Layout raiz (equiv. app/layout.tsx): script global AdSense Auto Ads */}
      <GoogleAdSense />
      <div className={`min-h-screen transition-colors duration-500 flex flex-col font-sans ${
        tema === 'light' ? 'bg-[#F8F9FA] text-zinc-900' : 'bg-black text-white'
      }`}>
        {/* TOAST SYSTEM PREMIUM */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
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

        {/* SEO GLOBAL DINÂMICO BASE */}
        <MudarMetaSEO
          title={t('app.title')}
          description={DEFAULT_DESCRIPTION}
        />

        {/* HEADER FIXO */}
        <header className={`sticky top-0 z-40 border-b select-none backdrop-blur-md ${
          tema === 'light' ? 'bg-white/80 border-zinc-200 text-black' : 'bg-black/80 border-zinc-900 text-white'
        }`}>
          <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2.5 group min-w-0">
              <img
                src="/brand/logo.svg"
                alt="Metamensagem"
                width={40}
                height={40}
                className="h-9 w-9 md:h-10 md:w-10 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
                decoding="async"
              />
              <span className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#A855F7] to-[#6366f1] tracking-tighter truncate">
                Metamensagem
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-400">
            </nav>

            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={toggleTema} 
                className={`p-2.5 rounded-2xl border transition-all hover:scale-110 ${
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
          <SocialHub tema={tema} />
        </div>

        {/* SUBHEADER DE NAVEGAÇÃO REFORÇADA */}
        <div className={`py-4 border-b sticky top-20 z-30 backdrop-blur-md transition-colors ${
          tema === 'light' ? 'bg-purple-50/80 border-purple-100/50' : 'bg-[#050505]/90 border-purple-900/20'
        }`}>
          <div className="max-w-5xl mx-auto px-4 flex justify-center gap-12 md:gap-20">
            <Link to="/frases" className={`text-[11px] font-black uppercase tracking-[0.4em] transition-all flex items-center gap-2.5 ${tema === 'light' ? 'text-purple-600' : 'text-purple-400'} hover:scale-105 active:scale-95`}>
              <div className="w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
              Frases
            </Link>
            <Link to="/metaforas" className={`text-[11px] font-black uppercase tracking-[0.4em] transition-all flex items-center gap-2.5 ${tema === 'light' ? 'text-purple-600' : 'text-purple-400'} hover:scale-105 active:scale-95`}>
              <div className="w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
              Metáforas
            </Link>
          </div>
        </div>

        {/* ROTAS DA APLICAÇÃO */}
        <div className="flex-1 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-mono text-[10px] uppercase tracking-widest opacity-40">Sincronizando Sabedoria Edge...</p>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<HomeView tema={tema} toast={mostrarToast} banco={bancoTotal} tags={tagsUnicas} bancoRandom={bancoRandom} />} />
              <Route path="/frases" element={<FrasesView tema={tema} toast={mostrarToast} banco={bancoTotal} />} />
              <Route path="/frases/:slug" element={<FraseDetalheView tema={tema} />} />
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
                    ItemCard={ItemCard}
                    AdBanner={AdBanner}
                    MudarMetaSEO={MudarMetaSEO}
                    ModalGeradorPost={CustomModalGeradorPost}
                  />
                }
              />
            </Routes>
          )}
        </div>

        {/* FOOTER */}
        <footer className={`py-8 text-center text-xs border-t mt-auto ${tema === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-zinc-950 border-zinc-900 text-zinc-600'}`}>
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
 * Sem <ins> manual — o Google Auto Ads usa a estrutura da página; min-height reduz CLS.
 */
function AdBanner({
  tema,
  placement,
}: {
  tema: string;
  placement:
    | 'home-in-feed'
    | 'frases-in-feed'
    | 'metaforas-in-feed'
    | 'metafora-detail-footer'
    | 'tag-in-feed';
}) {
  return (
    <aside
      data-mm-ad-zone="adsense-auto-ads"
      data-mm-ad-placement={placement}
      aria-label="Área de publicidade"
      className={`w-full min-h-[90px] py-10 px-6 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${
        tema === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-400' : 'bg-zinc-950 border-zinc-900 text-zinc-700'
      }`}
    >
      <span className="text-[10px] font-mono tracking-[0.5em] uppercase mb-2 pointer-events-none select-none">
        Espaço para Monetização
      </span>
      <p className="text-[9px] opacity-40 uppercase tracking-widest pointer-events-none select-none">
        Publicidade Responsiva MM
      </p>
    </aside>
  );
}

// ===================================================
// ITEM CARD
// ===================================================

function ItemCard({ 
  item, 
  tema, 
  onEditImage, 
  toast 
}: { 
  item: ItemConteudo; 
  tema: string; 
  onEditImage?: (item: ItemConteudo) => void;
  toast: (msg: string) => void;
  key?: any;
}) {
  const { t } = useTranslation();

  const [display, setDisplay] = useState<CardContentDisplay>(() => ({
    texto: item.texto,
    titulo: item.titulo,
    resumo: item.resumo,
    isTranslated: false,
  }));
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    setDisplay({
      texto: item.texto,
      titulo: item.titulo,
      resumo: item.resumo,
      isTranslated: false,
    });
  }, [item.id, item.texto, item.titulo, item.resumo]);

  const translateSource = useMemo(
    () => ({ texto: item.texto, titulo: item.titulo, resumo: item.resumo }),
    [item.texto, item.titulo, item.resumo]
  );
  
  const handleCopy = () => {
    const titulo = display.titulo ?? item.titulo;
    const texto = display.texto;
    const textToCopy = item.tipo === 'metafora' 
      ? `${titulo}\n\n${texto}\n— ${item.autor}`
      : `${texto} — ${item.autor}`;
    navigator.clipboard.writeText(textToCopy);
    toast(t('common.copied'));
  };

  const handleShare = () => {
    const titulo = display.titulo ?? item.titulo;
    const text =
      item.tipo === 'metafora'
        ? `${titulo}\n\n${display.texto}`
        : display.texto;
    const url = `${window.location.origin}/?text=${encodeURIComponent(text)}`;
    navigator.clipboard.writeText(url);
    toast(t('common.link_copied'));
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-[1px] rounded-[2.5rem] bg-gradient-to-br h-full ${
        item.tipo === 'frase' ? 'from-[#8B5CF6] to-[#3B82F6]' : 'from-[#8B5CF6] to-[#111111]'
      }`}
    >
      <div className={`p-8 rounded-[2.5rem] flex flex-col justify-between transition-all group relative overflow-hidden h-full ${
        tema === 'light' ? 'bg-white shadow-[0_10px_30px_rgb(0,0,0,0.03)] hover:shadow-2xl' : 'bg-[#0a0a0a] hover:bg-[#0d0d0d]'
      }`}>
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">{item.tipo}</span>
          </div>

          {item.tipo === 'frase' ? (
            <AnimatePresence mode="wait">
              <motion.p
                key={display.texto + String(display.isTranslated)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`text-2xl font-bold mb-6 leading-tight tracking-tight flex-1 transition-opacity duration-200 ${
                  translating ? 'opacity-55' : 'opacity-100'
                } ${tema === 'light' ? 'text-black' : 'text-white'}`}
              >
                "{display.texto}"
              </motion.p>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col flex-1">
              {item.imagem && <img src={item.imagem} alt={item.titulo} loading="lazy" className="w-full h-40 object-cover rounded-3xl mb-5 grayscale group-hover:grayscale-0 transition-all duration-700" />}
              <Link to={`/metafora/${item.id}/${normalizarParaSlug(item.titulo || '')}`} className={`text-xl font-black hover:text-[#A855F7] transition-colors block mb-3 leading-tight tracking-tighter ${tema === 'light' ? 'text-black' : 'text-white'}`}>
                {display.titulo ?? item.titulo}
              </Link>
              <AnimatePresence mode="wait">
                <motion.p
                  key={(display.resumo || display.texto) + String(display.isTranslated)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`text-sm line-clamp-3 leading-relaxed mb-4 flex-1 transition-opacity duration-200 ${
                    translating ? 'opacity-55' : 'opacity-100'
                  } ${tema === 'light' ? 'text-zinc-700' : 'text-zinc-400'}`}
                >
                  {display.resumo || display.texto}
                </motion.p>
              </AnimatePresence>
              
              <div className="mb-4">
                <Link 
                  to={`/metafora/${item.id}/${normalizarParaSlug(item.titulo || '')}`}
                  className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                    tema === 'light' ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'
                  }`}
                >
                  <BookOpen size={14} /> {t('common.read_metaphor')}
                </Link>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {item.tags?.slice(0, 3).map(tag => (
              <Link
                key={tag}
                to={pathFromTag(tag)}
                className="text-[9px] font-black px-2.5 py-1 rounded-full bg-purple-500/5 text-purple-400 border border-purple-500/10 hover:bg-purple-500/15 transition-colors"
              >
                #{tag.toUpperCase()}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-zinc-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-400 to-zinc-600 text-[10px] font-black tracking-widest uppercase truncate">POR {item.autor.toUpperCase()}</span>
          </div>
        </div>

        <div className="mt-8 flex justify-end items-end gap-2 relative z-10 min-h-[3.375rem]">
          <Tooltip text={t('common.copy')} tema={tema}>
            <button 
              onClick={handleCopy} 
              className={`p-3.5 rounded-2xl transition-all ${
                tema === 'light' ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 border border-white/5'
              }`}
            >
              <Copy size={18} />
            </button>
          </Tooltip>
          
          <Tooltip text={t('common.share')} tema={tema}>
            <button 
               onClick={handleShare}
              className={`p-3.5 rounded-2xl transition-all ${
                tema === 'light' ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 border border-white/5'
              }`}
            >
              <Share2 size={18} />
            </button>
          </Tooltip>

          <Tooltip text={t('common.translate')} tema={tema}>
            <CardTranslateMenu
              tema={tema}
              contentId={item.id}
              source={translateSource}
              onDisplayChange={setDisplay}
              onLoadingChange={setTranslating}
              tooltipLabel={t('common.translate')}
            />
          </Tooltip>

          {item.tipo === 'frase' && onEditImage && (
            <Tooltip text={t('common.edit_image')} tema={tema}>
              <button 
                onClick={() => onEditImage(item)} 
                className="p-3.5 bg-[#A855F7] hover:bg-[#9333EA] text-white rounded-2xl transition-all hover:scale-110 shadow-lg shadow-purple-500/20"
              >
                <ImageIcon size={18} />
              </button>
            </Tooltip>
          )}
        </div>

        {/* DECORAÇÃO BACKGROUND */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#A855F7]/5 rounded-full blur-3xl group-hover:bg-[#A855F7]/20 transition-colors pointer-events-none"></div>
      </div>
    </motion.div>
  );
}

function Tooltip({ children, text, tema }: { children: React.ReactNode; text: string; tema: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative flex flex-col items-center justify-end shrink-0 group" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`absolute bottom-full mb-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap z-[100] shadow-xl pointer-events-none ${
              tema === 'light' ? 'bg-zinc-800 text-white' : 'bg-white text-black'
            }`}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// COMPONENTE AUXILIAR SEO DINÂMICO
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
      `${SITE_ORIGIN}${window.location.pathname}${window.location.search || ''}`;
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

    const langs = ['pt', 'en', 'es', 'fr'];
    langs.forEach((l) => {
      let hreflang = document.querySelector(`link[hreflang="${l}"]`);
      if (!hreflang) {
        hreflang = document.createElement('link');
        hreflang.setAttribute('rel', 'alternate');
        hreflang.setAttribute('hreflang', l);
        document.head.appendChild(hreflang);
      }
      hreflang.setAttribute('href', pageUrl);
    });

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

// ===================================================
// VISÃO: HOME (CONSUMO DE INDEX)
// ===================================================
function HomeView({ tema, toast, banco, tags, bancoRandom }: { tema: string; toast: any; banco: ItemConteudo[]; tags: string[]; bancoRandom: ItemConteudo[] }) {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');
  const [itensVisiveis, setItensVisiveis] = useState(10);
  const [itemPost, setItemPost] = useState<ItemConteudo | null>(null);

  const resultadosFiltrados = useMemo(() => {
    if (!busca.trim()) return bancoRandom;
    return searchBancoSemantico(banco, busca);
  }, [busca, banco, bancoRandom]);

  const itensHome = useMemo(() => {
    const flattened: any[] = [];
    resultadosFiltrados.slice(0, itensVisiveis).forEach((item, index) => {
      flattened.push({ tipoItem: 'conteudo', content: item });
      if (index > 0 && (index + 1) % 6 === 0) {
        flattened.push({ tipoItem: 'anuncio', id: `ad-${index}` });
      }
    });
    return flattened;
  }, [resultadosFiltrados, itensVisiveis]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 flex flex-col"
    >
      <MudarMetaSEO
        title={t('app.tagline')}
        description={DEFAULT_DESCRIPTION}
        canonical={`${SITE_ORIGIN}/`}
      />

      <section className="text-center py-12">
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-none"
        >
          {t('app.tagline').split('Mudança.')[0]} <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF]">Mudança.</span>
        </motion.h1>
        
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input 
            type="text" 
            placeholder={t('home.search_placeholder')} 
            value={busca}
            onChange={e => { setBusca(e.target.value); setItensVisiveis(10); }}
            className={`w-full py-5 pl-14 pr-6 rounded-[2rem] border-2 font-medium outline-none transition-all shadow-xl ${
              tema === 'light' ? 'bg-white border-zinc-100 text-black focus:border-[#A855F7] shadow-zinc-200' : 'bg-zinc-900 border-zinc-800 text-white focus:border-[#A855F7] shadow-black/50'
            }`}
          />
        </div>

        {/* TAG CLOUD — links indexáveis (filtro local permanece na barra de busca) */}
        <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-2xl mx-auto">
          {tags.slice(0, 12).map(tag => (
            <Link
              key={tag}
              to={pathFromTag(tag)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                tema === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:border-[#A855F7] hover:text-[#A855F7]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-[#A855F7] hover:text-[#A855F7]'
              }`}
            >
              #{tag}
            </Link>
          ))}
        </div>
      </section>

      <div className={GRID_CONTENT}>
        <AnimatePresence mode="popLayout">
          {itensHome.map((itemObj) => {
            if (itemObj.tipoItem === 'anuncio') {
              return (
                <motion.div 
                  key={itemObj.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full h-full"
                >
                  <AdBanner tema={tema} placement="home-in-feed" />
                </motion.div>
              );
            }

            const item = itemObj.content;
            return (
              <div key={item.id}>
                {renderContentCard({
                  item,
                  tema,
                  toast,
                  onEditImage: setItemPost,
                  ItemCard,
                })}
              </div>
            );
          })}
        </AnimatePresence>
      </div>

      {resultadosFiltrados.length > itensVisiveis && (
        <button 
          onClick={() => setItensVisiveis(p => p + 10)} 
          className="w-full mt-10 py-5 bg-transparent border-2 border-dashed border-zinc-800 rounded-[2rem] text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-[#A855F7] hover:bg-[#A855F7]/5 transition-all"
        >
          {t('home.explore_more')}
        </button>
      )}

      <SocialHub tema={tema} />

      {itemPost && (
        <CustomModalGeradorPost 
          item={itemPost} 
          onClose={() => setItemPost(null)} 
          toast={toast} 
          temaGlobal={tema} 
        />
      )}
    </motion.div>
  );
}

/** Contador discreto abaixo do título (coleção / filtro ativo). */
function ColecaoContador({
  tema,
  total,
  visiveis,
  buscaAtiva,
  singular,
  plural,
}: {
  tema: string;
  total: number;
  visiveis?: number;
  buscaAtiva?: boolean;
  singular: string;
  plural: string;
}) {
  const rotulo = total === 1 ? singular : plural;
  const texto =
    buscaAtiva && visiveis !== undefined && visiveis !== total
      ? `${visiveis.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} ${rotulo} disponíveis`
      : `${total.toLocaleString('pt-BR')} ${rotulo} disponíveis`;

  return (
    <p
      className={`text-sm md:text-[15px] font-medium tracking-wide mb-6 -mt-2 ${
        tema === 'light' ? 'text-zinc-500/80' : 'text-zinc-400/75'
      }`}
      aria-live="polite"
    >
      {texto}
    </p>
  );
}

// ===================================================
// VISÃO: LISTA DE FRASES
// ===================================================
function FrasesView({ tema, toast, banco }: { tema: string; toast: any; banco: ItemConteudo[] }) {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');
  const [itemPost, setItemPost] = useState<ItemConteudo | null>(null);

  const baseFrases = useMemo(() => {
    const list = banco.filter(i => i.tipo === 'frase');
    const newArr = [...list];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }, [banco]);

  const frases = useMemo(() => {
    if (!busca.trim()) return baseFrases;
    return searchBancoSemantico(baseFrases, busca, ['texto', 'autor', 'tags']);
  }, [busca, baseFrases]);

  const tags = useMemo(() => {
    return Array.from(new Set(baseFrases.flatMap(f => f.tags || []))).sort().slice(0, 10);
  }, [baseFrases]);

  const itensFrases = useMemo(() => {
    const flattened: any[] = [];
    frases.forEach((f, index) => {
      flattened.push({ tipoItem: 'conteudo', content: f });
      if (index > 0 && (index + 1) % 6 === 0) {
        flattened.push({ tipoItem: 'anuncio', id: `ad-${index}` });
      }
    });
    return flattened;
  }, [frases]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl w-full mx-auto px-4 py-8 flex-1"
    >
      <MudarMetaSEO
        title="Banco Total de Frases"
        description="Explore milhares de insights e citações curtas catalogadas para status, redes sociais e reflexão."
        canonical={`${SITE_ORIGIN}/frases`}
      />
      
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black mb-2 uppercase tracking-widest text-[#A855F7] flex items-center justify-center gap-3">
          <Quote /> Coleção de Frases
        </h2>
        <ColecaoContador
          tema={tema}
          total={baseFrases.length}
          visiveis={frases.length}
          buscaAtiva={!!busca.trim()}
          singular="frase"
          plural="frases"
        />
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar frase ou autor..." 
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className={`w-full py-4 pl-14 pr-6 rounded-2xl border-2 font-medium outline-none transition-all ${
              tema === 'light' ? 'bg-white border-zinc-100 text-black focus:border-[#A855F7]' : 'bg-zinc-900 border-zinc-800 text-white focus:border-[#A855F7]'
            }`}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {tags.map(tag => (
            <button key={tag} onClick={() => setBusca(tag)} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${busca === tag ? 'bg-purple-600 border-purple-600 text-white' : 'bg-zinc-500/5 text-zinc-500 border-zinc-500/10 hover:border-zinc-500/30'}`}>#{tag}</button>
          ))}
        </div>
      </div>

      <div className={GRID_CONTENT}>
        {itensFrases.map((itemObj) => {
          if (itemObj.tipoItem === 'anuncio') {
            return (
              <div key={itemObj.id} className="col-span-full">
                <AdBanner tema={tema} placement="frases-in-feed" />
              </div>
            );
          }

          return (
            <div key={itemObj.content.id}>
              {renderContentCard({
                item: itemObj.content,
                tema,
                toast,
                onEditImage: setItemPost,
                ItemCard,
              })}
            </div>
          );
        })}
      </div>
      
      <SocialHub tema={tema} />

      {itemPost && (
        <CustomModalGeradorPost 
          item={itemPost} 
          onClose={() => setItemPost(null)} 
          toast={toast} 
          temaGlobal={tema} 
        />
      )}
    </motion.div>
  );
}

// ===================================================
// VISÃO: LISTA DE METÁFORAS
// ===================================================
function MetaforasView({ tema, toast, banco }: { tema: string; toast: any; banco: ItemConteudo[] }) {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');
  const baseMetaforas = useMemo(() => filtrarMetaforasDoBanco(banco), [banco]);

  const metaforas = useMemo(() => {
    if (!busca.trim()) return baseMetaforas;
    return searchBancoSemantico(baseMetaforas, busca, ['titulo', 'texto', 'autor', 'tags', 'resumo']);
  }, [busca, baseMetaforas]);

  const tags = useMemo(() => {
    return Array.from(new Set(baseMetaforas.flatMap(m => m.tags || []))).sort().slice(0, 10);
  }, [baseMetaforas]);

  const itensMetaforas = useMemo(() => {
    const flattened: any[] = [];
    metaforas.forEach((m, index) => {
      flattened.push({ tipoItem: 'conteudo', content: m });
      if (index > 0 && (index + 1) % 6 === 0) {
        flattened.push({ tipoItem: 'anuncio', id: `ad-${index}` });
      }
    });
    return flattened;
  }, [metaforas]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl w-full mx-auto px-4 py-8 flex-1"
    >
      <MudarMetaSEO
        title="Índice de Metáforas Terapêuticas"
        description="Contos e narrativas profundas focadas em psicologia aplicada, insights inconscientes e reprogramação de atitudes."
        canonical={`${SITE_ORIGIN}/metaforas`}
      />
      
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black mb-2 uppercase tracking-widest text-[#A855F7] flex items-center justify-center gap-3">
          <BookOpen /> Arquivo de Metáforas
        </h2>
        <ColecaoContador
          tema={tema}
          total={baseMetaforas.length}
          visiveis={metaforas.length}
          buscaAtiva={!!busca.trim()}
          singular="metáfora"
          plural="metáforas"
        />
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Encontrar metáfora..." 
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className={`w-full py-4 pl-14 pr-6 rounded-2xl border-2 font-medium outline-none transition-all ${
              tema === 'light' ? 'bg-white border-zinc-100 text-black focus:border-[#A855F7]' : 'bg-zinc-900 border-zinc-800 text-white focus:border-[#A855F7]'
            }`}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {tags.map(tag => (
            <button key={tag} onClick={() => setBusca(tag)} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${busca === tag ? 'bg-purple-600 border-purple-600 text-white' : 'bg-zinc-500/5 text-zinc-500 border-zinc-500/10 hover:border-zinc-500/30'}`}>#{tag}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {itensMetaforas.map((itemObj) => {
          if (itemObj.tipoItem === 'anuncio') {
            return (
              <div key={itemObj.id} className="col-span-full">
                <AdBanner tema={tema} placement="metaforas-in-feed" />
              </div>
            );
          }

          return (
            <ItemCard 
              key={itemObj.content.id} 
              item={itemObj.content} 
              tema={tema} 
              toast={toast} 
            />
          );
        })}
     </div>

     <SocialHub tema={tema} />
    </motion.div>
  );
}

// VISÃO: DETALHE DA METÁFORA (CARREGAMENTO DINÂMICO ESTRUTURADO)
// ===================================================
function MetaforaDetalheView({ tema, banco, toast }: { tema: string; banco: ItemConteudo[]; toast: any }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const [fontSize, setFontSize] = useState(20);
  const [item, setItem] = useState<ItemConteudo | null>(null);
  const [loading, setLoading] = useState(true);
  const [display, setDisplay] = useState<CardContentDisplay>({
    texto: '',
    isTranslated: false,
  });
  const [translating, setTranslating] = useState(false);

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

  useEffect(() => {
    if (!item) return;
    setDisplay({
      texto: item.texto || '',
      titulo: item.titulo,
      resumo: item.resumo,
      isTranslated: false,
    });
  }, [item?.id, item?.texto, item?.titulo, item?.resumo]);

  const translateSource = useMemo(
    () =>
      item
        ? { texto: item.texto || '', titulo: item.titulo, resumo: item.resumo }
        : { texto: '' },
    [item]
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-40">Extraindo Sabedoria do Fragmento...</p>
      </div>
    );
  }

  if (!item) return <div className="p-20 text-center text-red-500">Metáfora não localizada no fragmento de borda.</div>;

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
        title={item.titulo || 'Metáfora terapêutica'}
        description={item.resumo || DEFAULT_DESCRIPTION}
        canonical={canonicalUrl}
        ogType="article"
        jsonLD={jsonLD}
      />
      
      <div className={`mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-10 ${tema === 'light' ? 'border-zinc-200' : 'border-zinc-800'}`}>
        <div className="flex-1">
          <Link to="/metaforas" className="text-[10px] uppercase font-black text-[#A855F7] tracking-[0.2em] mb-4 flex items-center gap-2 hover:gap-3 transition-all">
            <ChevronRight size={12} className="rotate-180" /> Metáfora Terapêutica
          </Link>
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
          <div className="flex items-center gap-4 text-xs font-bold text-zinc-500">
            <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${tema === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'}`}><BookOpen size={14} /> ~{tempoLeitura} MIN DE REFLEXÃO</span>
            <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${tema === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'}`}><Quote size={14} /> SABEDORIA SECULAR</span>
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
            className={translating ? 'opacity-55' : 'opacity-100'}
          >
            {sanitizeTextForTranslation(display.texto) || item.texto}
          </motion.div>
        </AnimatePresence>
      </article>

       <div className={`mt-16 py-10 border-t flex flex-col items-center ${tema === 'light' ? 'border-zinc-200' : 'border-zinc-900'}`}>
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#A855F7] to-transparent mb-8"></div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
          <span className="text-2xl font-black text-[#A855F7] text-center italic tracking-widest">{item.autor.toUpperCase()}</span>
        </div>
        <div className="flex gap-4 mt-6 items-end min-h-[3.5rem]">
          <Tooltip text={t('common.copy')} tema={tema}>
            <button 
              onClick={() => {
                const titulo = display.titulo ?? item.titulo;
                const texto = display.texto || item.texto;
                navigator.clipboard.writeText(`${titulo}\n\n${texto}\n— ${item.autor}`);
                toast(t('common.copied'));
              }}
              className={`p-4 rounded-2xl ${tema === 'light' ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-900 text-zinc-400'}`}
            >
              <Copy size={20} />
            </button>
          </Tooltip>
          <Tooltip text={t('common.translate')} tema={tema}>
            <CardTranslateMenu
              tema={tema}
              contentId={item.id}
              source={translateSource}
              onDisplayChange={setDisplay}
              onLoadingChange={setTranslating}
              tooltipLabel={t('common.translate')}
              menuPlacement="bottom"
              buttonClassName="h-14 w-14 p-0 flex items-center justify-center"
            />
          </Tooltip>
          <Tooltip text={t('common.share')} tema={tema}>
            <button 
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast(t('common.link_copied')); }}
              className={`p-4 rounded-2xl ${tema === 'light' ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-900 text-zinc-400'}`}
            >
              <Share2 size={20} />
            </button>
          </Tooltip>
        </div>
      </div>

       <SocialHub tema={tema} />

      {/* NAVEGAÇÃO ENTRE METAFORAS */}
      <div className="mt-12 flex flex-col sm:flex-row justify-between gap-4">
        {navigation.prev ? (
          <Link 
            to={`/metafora/${navigation.prev.id}/${normalizarParaSlug(navigation.prev.titulo || '')}`}
            className={`flex-1 flex items-center gap-3 p-5 rounded-3xl border transition-all ${tema === 'light' ? 'bg-white border-zinc-100 hover:bg-zinc-50' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900'}`}
          >
            <ChevronLeft size={16} className="text-purple-500 shrink-0" />
            <div className="text-left overflow-hidden">
              <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1">Anterior</span>
              <span className="text-xs font-bold truncate block leading-tight">{navigation.prev.titulo}</span>
            </div>
          </Link>
        ) : <div className="flex-1 hidden sm:block" />}
        
        {navigation.next ? (
          <Link 
            to={`/metafora/${navigation.next.id}/${normalizarParaSlug(navigation.next.titulo || '')}`}
            className={`flex-1 flex items-center justify-end gap-3 p-5 rounded-3xl border transition-all ${tema === 'light' ? 'bg-white border-zinc-100 hover:bg-zinc-50' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900'}`}
          >
            <div className="text-right overflow-hidden">
              <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1">Próxima</span>
              <span className="text-xs font-bold truncate block leading-tight">{navigation.next.titulo}</span>
            </div>
            <ChevronRight size={16} className="text-purple-500 shrink-0" />
          </Link>
        ) : <div className="flex-1 hidden sm:block" />}
      </div>
      
      <div className="mt-12">
        <AdBanner tema={tema} placement="metafora-detail-footer" />
      </div>
    </motion.div>
  );
}




