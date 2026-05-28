import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BookOpen, Copy, Image as ImageIcon, Share2 } from 'lucide-react';
import { CardTranslateMenu } from './CardTranslateMenu';
import { type CardContentDisplay } from '../lib/translation';
import { pathFromTag } from '../lib/tagsSeo';
import { normalizarParaSlug } from '../lib/slug';
import type { ItemConteudo } from '../types/content';

function Tooltip({
  children,
  text,
  tema,
}: {
  children: React.ReactNode;
  text: string;
  tema: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center justify-end shrink-0 group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute bottom-full mb-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap z-50 ${
              tema === 'light' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const readMoreBtnClass = (tema: string) =>
  tema === 'light'
    ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20';

export default function ContentCard({
  item,
  tema,
  onEditImage,
  toast,
}: {
  item: ItemConteudo;
  tema: string;
  onEditImage?: (item: ItemConteudo) => void;
  toast: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const isFrase = item.tipo === 'frase';

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

  const detailPath = isFrase
    ? `/frases/${item.slug || normalizarParaSlug(item.texto)}`
    : `/metafora/${item.id}/${normalizarParaSlug(item.titulo || '')}`;

  const buttonLabel = isFrase ? t('common.learn_more') : t('common.read_metaphor');

  const bodyText = isFrase ? display.texto : display.resumo || display.texto;

  const handleCopy = () => {
    const titulo = display.titulo ?? item.titulo;
    const texto = display.texto;
    const textToCopy = isFrase
      ? `${texto} — ${item.autor}`
      : `${titulo}\n\n${texto}\n— ${item.autor}`;
    navigator.clipboard.writeText(textToCopy);
    toast(t('common.copied'));
  };

  const handleShare = async () => {
    const titulo = display.titulo ?? item.titulo;
    const text = isFrase ? display.texto : `${titulo}\n\n${display.texto}`;
    const shareUrl = `${window.location.origin}${detailPath}`;
    const sharePayload = isFrase
      ? { title: item.autor, text: `${text} — ${item.autor}`, url: shareUrl }
      : { title: titulo, text, url: shareUrl };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }

    await navigator.clipboard.writeText(shareUrl);
    toast(t('common.link_copied'));
  };

  const actionBtnClass =
    tema === 'light'
      ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
      : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 border border-white/5';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-[1px] rounded-[2.5rem] bg-gradient-to-br from-[#8B5CF6] to-[#111111] h-full"
    >
      <div
        className={`p-8 rounded-[2.5rem] flex flex-col justify-between transition-all group relative overflow-hidden h-full ${
          tema === 'light'
            ? 'bg-white shadow-[0_10px_30px_rgb(0,0,0,0.03)] hover:shadow-2xl'
            : 'bg-[#0a0a0a] hover:bg-[#0d0d0d]'
        }`}
      >
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
              {item.tipo}
            </span>
          </div>

          <div className="flex flex-col flex-1">
            {!isFrase && item.imagem && (
              <img
                src={item.imagem}
                alt={item.titulo}
                loading="lazy"
                className="w-full h-40 object-cover rounded-3xl mb-5 grayscale group-hover:grayscale-0 transition-all duration-700"
              />
            )}

            {!isFrase && (
              <Link
                to={detailPath}
                className={`text-xl font-black hover:text-[#A855F7] transition-colors block mb-3 leading-tight tracking-tighter ${
                  tema === 'light' ? 'text-black' : 'text-white'
                }`}
              >
                {display.titulo ?? item.titulo}
              </Link>
            )}

            <AnimatePresence mode="wait">
              <motion.p
                key={bodyText + String(display.isTranslated)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`text-sm line-clamp-3 leading-relaxed mb-4 flex-1 transition-opacity duration-200 ${
                  translating ? 'opacity-55' : 'opacity-100'
                } ${tema === 'light' ? 'text-zinc-700' : 'text-zinc-400'}`}
              >
                {isFrase ? `"${bodyText}"` : bodyText}
              </motion.p>
            </AnimatePresence>

            <div className="mb-4">
              <Link
                to={detailPath}
                className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${readMoreBtnClass(tema)}`}
              >
                <BookOpen size={14} />
                {buttonLabel}
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-auto">
            {item.tags?.slice(0, 3).map((tag) => (
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
            <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-400 to-zinc-600 text-[10px] font-black tracking-widest uppercase truncate">
              {t('common.author')} {item.autor.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mt-8 flex justify-end items-end gap-2 relative z-10 min-h-[3.375rem]">
          <Tooltip text={t('common.copy')} tema={tema}>
            <button
              type="button"
              onClick={handleCopy}
              className={`p-3.5 rounded-2xl transition-all ${actionBtnClass}`}
            >
              <Copy size={18} />
            </button>
          </Tooltip>

          <Tooltip text={t('common.share')} tema={tema}>
            <button
              type="button"
              onClick={() => void handleShare()}
              className={`p-3.5 rounded-2xl transition-all ${actionBtnClass}`}
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

          {isFrase && onEditImage && (
            <Tooltip text={t('common.edit_image')} tema={tema}>
              <button
                type="button"
                onClick={() => onEditImage(item)}
                className="p-3.5 bg-[#A855F7] hover:bg-[#9333EA] text-white rounded-2xl transition-all hover:scale-110 shadow-lg shadow-purple-500/20"
              >
                <ImageIcon size={18} />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#A855F7]/5 rounded-full blur-3xl group-hover:bg-[#A855F7]/20 transition-colors pointer-events-none" />
      </div>
    </motion.div>
  );
}
