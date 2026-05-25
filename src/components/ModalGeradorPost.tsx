import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { domToPng, domToBlob } from 'modern-screenshot';
import { 
  Download, 
  Share2, 
  Instagram, 
  MessageSquare, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  X,
  RefreshCw,
  Clock,
  CheckCircle2,
  Smartphone,
  Monitor
} from 'lucide-react';

interface ItemConteudo {
  id: string;
  tipo: 'frase' | 'metafora';
  texto: string;
  autor: string;
  tags: string[];
  titulo?: string;
  resumo?: string;
  imagem?: string;
}

interface ModalProps {
  item: ItemConteudo;
  onClose: () => void;
  toast: (msg: string, tipo?: 'sucesso' | 'info' | 'erro') => void;
  temaGlobal: string;
}

// Re-using AdBanner from App.tsx (I'll need to export it or redefine it)
function AdBannerLocal({ tema }: { tema: string }) {
  return (
    <div className={`w-full py-8 px-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${
      tema === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-400' : 'bg-zinc-950 border-zinc-900 text-zinc-700'
    }`}>
      <span className="text-[9px] font-mono tracking-[0.5em] uppercase mb-1">Publicidade MM</span>
      <p className="text-[8px] opacity-40 uppercase tracking-widest">Espaço para Monetização</p>
    </div>
  );
}

export default function ModalGeradorPost({ item, onClose, toast, temaGlobal }: ModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [corFundo, setCorFundo] = useState('#000000');
  const [corTexto, setCorTexto] = useState('#ffffff');
  const [tamanhoFonte, setTamanhoFonte] = useState(42);
  const [pesoFonte, setPesoFonte] = useState<'normal' | 'black'>('black');
  const [alinhamento, setAlinhamento] = useState<'left' | 'center' | 'right'>('center');
  const [aspectRatio, setAspectRatio] = useState<'1/1' | '4/5' | '9/16'>('4/5');
  
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isReady, setIsReady] = useState(false);
  const [motivationalQuote, setMotivationalQuote] = useState('');

  const motivationalQuotes = [
    "Grandes mudanças começam com pequenas decisões.",
    "A persistência é o caminho do êxito.",
    "Sua mente é sua ferramenta mais poderosa.",
    "Cada dia é uma nova oportunidade de florescer.",
    "Onde há foco, a energia flui.",
    "Acredite no seu potencial infinito.",
    "Pequenas vitórias levam a grandes destinos.",
    "A gratidão transforma o que temos em suficiente."
  ];

  const textoExibido = item.tipo === 'metafora' 
    ? `${item.titulo}\n\n${item.resumo || (item.texto ? item.texto.substring(0, 180) + '...' : '')}`
    : item.texto;

  // Countdown timer logic
  useEffect(() => {
    let timer: any;
    if (showCountdown && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsReady(true);
    }
    return () => clearInterval(timer);
  }, [showCountdown, countdown]);

  const initiateSave = () => {
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    setCountdown(10);
    setShowCountdown(true);
    setIsReady(false);
  };

  const executeDownload = async () => {
    if (!canvasRef.current) return;
    toast(t('editor.preparing'), 'info');
    
    try {
      const dataUrl = await domToPng(canvasRef.current, { 
        scale: 3, 
        backgroundColor: corFundo,
        quality: 1
      });
      
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:T]/g, '-').split('.')[0];
      const filename = `metamensagem-frase-${timestamp}.png`;
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast(t('common.download') + ' OK!', 'sucesso');
    } catch (e) {
      console.error(e);
      toast('Erro na exportação', 'erro');
    }
  };

  const executeShare = async () => {
    if (!canvasRef.current) return;
    toast(t('editor.preparing'), 'info');

    try {
      const blob = await domToBlob(canvasRef.current, { 
        scale: 2, 
        backgroundColor: corFundo 
      });
      
      if (!blob) throw new Error('Blob creation failed');

      const file = new File([blob], 'metamensagem-post.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Metamensagem',
          text: `"${item.texto}" — ${item.autor} #metamensagem`
        });
      } else {
        executeDownload();
        toast(t('editor.download_ready') + ' ' + t('editor.share_social'), 'info');
      }
    } catch (e) {
      console.error(e);
      toast('Compartilhamento não disponível', 'erro');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4 md:p-6 overflow-hidden"
    >
      <div className="max-w-6xl w-full h-full flex flex-col lg:flex-row gap-6 md:gap-10 items-stretch py-4 overflow-auto scrollbar-hide">
        
        {/* LADO ESQUERDO: PREVIEW */}
        <div className="flex flex-col gap-6 w-full lg:max-w-[500px] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
              <span className="w-2 h-8 bg-purple-600 rounded-full"></span>
              {t('editor.title')}
            </h2>
            <button onClick={onClose} className="lg:hidden p-3 bg-white/5 rounded-2xl text-zinc-400 hover:text-white transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="relative group overflow-hidden bg-zinc-900/50 rounded-[2.5rem] p-4 border border-white/5 shadow-2xl">
            <div 
              ref={canvasRef}
              className={`relative mx-auto overflow-hidden shadow-2xl transition-all duration-500 rounded-2xl ${
                aspectRatio === '1/1' ? 'aspect-square' : 
                aspectRatio === '4/5' ? 'aspect-[4/5]' : 
                'aspect-[9/16] h-[600px] w-auto'
              }`}
              style={{ backgroundColor: corFundo, width: aspectRatio === '9/16' ? 'auto' : '100%' }}
            >
              {/* LOGO MM BACKGROUND */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 opacity-[0.03]">
                <div className="w-64 h-64 bg-white/20 rounded-full flex items-center justify-center blur-2xl"></div>
              </div>

              {/* CONTEÚDO */}
              <div className={`absolute inset-0 flex flex-col p-10 z-20 ${
                alinhamento === 'center' ? 'items-center justify-center text-center' : 
                alinhamento === 'left' ? 'items-start justify-center text-left' : 
                'items-end justify-center text-right'
              }`}>
                <article 
                  className={`tracking-tight drop-shadow-2xl whitespace-pre-wrap leading-tight ${
                    pesoFonte === 'black' ? 'font-black' : 'font-medium'
                  }`}
                  style={{ color: corTexto, fontSize: `${tamanhoFonte}px` }}
                >
                  "{textoExibido}"
                </article>
                <div className="mt-8 flex flex-col items-inherit">
                   <span className={`block font-black tracking-widest uppercase opacity-60 ${
                    pesoFonte === 'black' ? 'font-black' : 'font-bold'
                  }`} style={{ color: corTexto, fontSize: `${Math.max(12, tamanhoFonte * 0.4)}px` }}>
                    — {item.autor}
                  </span>
                  <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-transparent mt-4 rounded-full"></div>
                </div>
              </div>

              {/* FOOTER DA ARTE (ASSINATURA PREMIUM RESPONSIVA) */}
              <div 
                className="absolute left-0 right-0 flex justify-center pointer-events-none z-40"
                style={{ bottom: aspectRatio === '9/16' ? '6%' : '5%' }}
              >
                <span 
                  className="font-black uppercase tracking-[0.8em] transition-all duration-500" 
                  style={{ 
                    color: corTexto, 
                    opacity: 0.35,
                    fontSize: aspectRatio === '9/16' ? '8px' : aspectRatio === '4/5' ? '7px' : '6px'
                  }}
                >
                  METAMENSAGEM
                </span>
              </div>
            </div>
            
            {/* OVERLAY DE AJUDA */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-white uppercase tracking-widest px-4 py-2 bg-black/60 rounded-full backdrop-blur-md">Artboard Premium</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={initiateSave} 
              className="py-6 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-3xl uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-purple-900/40 active:scale-95 group"
            >
              <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" /> 
              Salvar Imagem
            </button>
          </div>

          <AdBannerLocal tema="dark" />
        </div>

        {/* LADO DIREITO: FERRAMENTAS */}
        <div className="flex-1 bg-zinc-950/50 border border-white/5 p-8 rounded-[3rem] text-white flex flex-col">
          <div className="hidden lg:flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600 rounded-xl">
                <RefreshCw size={20} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest text-zinc-100">{t('editor.controls')}</h3>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors border border-white/5">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-10 flex-1 overflow-auto pr-2 custom-scrollbar pb-10">
            {/* FORMATO */}
            <div className="space-y-4">
              <label className="text-[11px] uppercase font-black tracking-[0.2em] text-zinc-500 block">{t('editor.format')}</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: '1/1', label: t('editor.square'), icon: <AlignCenter size={16} /> },
                  { id: '4/5', label: t('editor.portrait'), icon: <AlignLeft size={16} /> },
                  { id: '9/16', label: t('editor.story'), icon: <AlignRight size={16} /> }
                ].map((f) => (
                  <button 
                    key={f.id}
                    onClick={() => setAspectRatio(f.id as any)}
                    className={`flex flex-col items-center gap-2 py-4 rounded-3xl border transition-all ${
                      aspectRatio === f.id ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    {f.icon}
                    <span className="text-[9px] font-black uppercase tracking-widest">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CORES */}
            <div className="grid grid-cols-2 gap-8 text-center">
              <div>
                <label className="text-[11px] uppercase font-black tracking-[0.2em] text-zinc-500 block mb-4">{t('editor.background')}</label>
                <div className="relative group">
                   <input 
                    type="color" 
                    value={corFundo} 
                    onChange={e => setCorFundo(e.target.value)} 
                    className="w-full h-16 rounded-3xl bg-zinc-900 border-2 border-white/5 cursor-pointer p-1 overflow-hidden appearance-none" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-mono text-white/40 group-hover:text-white transition-colors">{corFundo.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase font-black tracking-[0.2em] text-zinc-500 block mb-4">{t('editor.text_color')}</label>
                <div className="relative group">
                  <input 
                    type="color" 
                    value={corTexto} 
                    onChange={e => setCorTexto(e.target.value)} 
                    className="w-full h-16 rounded-3xl bg-zinc-900 border-2 border-white/5 cursor-pointer p-1 overflow-hidden appearance-none" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-mono text-white/40 group-hover:text-white transition-colors">{corTexto.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FONTE */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-[11px] uppercase font-black tracking-[0.2em] text-zinc-500 block">{t('editor.font_size')}</label>
                <span className="text-xl font-black text-purple-400">{tamanhoFonte}px</span>
              </div>
              <input 
                type="range" 
                min="20" max="100" 
                value={tamanhoFonte} 
                onChange={e => setTamanhoFonte(Number(e.target.value))} 
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600" 
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="text-[11px] uppercase font-black tracking-[0.2em] text-zinc-500 block mb-5">{t('editor.weight')}</label>
                <div className="flex p-1.5 bg-zinc-900 rounded-2xl border border-white/5">
                  <button onClick={() => setPesoFonte('normal')} className={`flex-1 py-3 rounded-xl text-[10px] font-bold tracking-widest transition-all ${pesoFonte === 'normal' ? 'bg-zinc-800 text-white border border-white/10 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>REGULAR</button>
                  <button onClick={() => setPesoFonte('black')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${pesoFonte === 'black' ? 'bg-zinc-800 text-white border border-white/10 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>BLACK</button>
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase font-black tracking-[0.2em] text-zinc-500 block mb-5">{t('editor.alignment')}</label>
                <div className="flex p-1.5 bg-zinc-900 rounded-2xl border border-white/5">
                  <button onClick={() => setAlinhamento('left')} className={`flex-1 py-3 rounded-xl flex justify-center transition-all ${alinhamento === 'left' ? 'bg-zinc-800 text-purple-500 border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}><AlignLeft size={16} /></button>
                  <button onClick={() => setAlinhamento('center')} className={`flex-1 py-3 rounded-xl flex justify-center transition-all ${alinhamento === 'center' ? 'bg-zinc-800 text-purple-500 border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}><AlignCenter size={16} /></button>
                  <button onClick={() => setAlinhamento('right')} className={`flex-1 py-3 rounded-xl flex justify-center transition-all ${alinhamento === 'right' ? 'bg-zinc-800 text-purple-500 border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}><AlignRight size={16} /></button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setCorFundo('#000000');
                setCorTexto('#ffffff');
                setTamanhoFonte(42);
                setPesoFonte('black');
                setAlinhamento('center');
                setAspectRatio('4/5');
              }}
              className="w-full py-5 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 hover:text-white transition-all border border-dashed border-zinc-800 rounded-3xl mt-10 hover:border-white/20"
            >
              {t('editor.reset')}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CONTAGEM / MONETIZAÇÃO */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[3rem] p-10 text-center shadow-2xl">
              <div className="mb-8 relative flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-zinc-800 flex items-center justify-center">
                  <span className="text-5xl font-black text-white">{countdown}</span>
                </div>
                <svg className="absolute w-32 h-32 rotate-[-90deg]">
                  <circle
                    cx="64"
                    cy="64"
                    r="62"
                    fill="transparent"
                    stroke="#A855F7"
                    strokeWidth="4"
                    strokeDasharray={389.5}
                    strokeDashoffset={389.5 - (389.5 * countdown) / 10}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
              </div>

              <h4 className="text-2xl font-black text-white mb-2 leading-tight">
                {isReady ? "Sua imagem está pronta!" : t('editor.preparing')}
              </h4>
              
              <div className="min-h-[60px] flex items-center justify-center mb-8">
                {!isReady && (
                  <p className="text-purple-400 text-sm font-black uppercase tracking-widest animate-pulse">
                    {motivationalQuote}
                  </p>
                )}
                {isReady && (
                   <p className="text-zinc-500 text-sm font-medium leading-relaxed px-4">
                    Sua arte premium está finalizada e pronta para brilhar.
                  </p>
                )}
              </div>

              <div className="p-1 px-1.5 flex flex-col gap-6">
                {/* BANNER DE ANÚNCIO NO MODAL */}
                <div className="w-full bg-zinc-950 rounded-3xl p-6 border border-white/5 shadow-inner">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                        <Monitor size={14} className="text-zinc-700" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 w-1/2 bg-zinc-900 rounded"></div>
                        <div className="h-1.5 w-1/3 bg-zinc-900 rounded"></div>
                      </div>
                   </div>
                   <div className="h-20 w-full bg-zinc-900/40 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-[8px] font-mono tracking-[0.5em] text-zinc-700 uppercase">
                      Espaço Publicitário
                   </div>
                </div>
                
                {isReady ? (
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={executeDownload}
                      className="py-5 bg-white text-black font-black text-xs rounded-3xl uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                    >
                      <Download size={18} /> Download
                    </button>
                    <button 
                      onClick={executeShare}
                      className="py-5 bg-purple-600 text-white font-black text-xs rounded-3xl uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                    >
                      <Share2 size={18} /> Partilhar
                    </button>
                    <button 
                      onClick={() => setShowCountdown(false)}
                      className="col-span-2 py-4 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                      Voltar ao Editor
                    </button>
                  </div>
                ) : (
                  <p className="text-zinc-600 text-[10px] uppercase font-black tracking-widest">
                    Aguarde {countdown} segundos...
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
