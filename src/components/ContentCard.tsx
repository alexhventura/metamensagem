import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BookOpen, Copy, Image as ImageIcon, Share2 } from 'lucide-react';
import { CardTranslateMenu } from './CardTranslateMenu';
import CardTooltip from './CardTooltip';
import { type CardContentDisplay } from '../lib/translation';
import { pathFromTag } from '../lib/tagsSeo';
import { normalizarParaSlug } from '../lib/slug';
import {
  CARD_ACTION_BTN,
  cardAccentDotClass,
  cardAccentForTipo,
  cardBorderGradient,
  cardImageBtnClass,
  cardNeutralActionClass,
  cardReadMoreBtnClass,
  cardTagClass,
  cardTitleLinkClass,
} from '../lib/cardTheme';
import type { ItemConteudo } from '../types/content';

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
  const accent = cardAccentForTipo(item.tipo);

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

  const neutralAction = cardNeutralActionClass(tema);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-[1px] rounded-[2.5rem] ${cardBorderGradient(accent)} h-full`}
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
            <span className={`w-1.5 h-1.5 rounded-full ${cardAccentDotClass(accent)}`} />
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

            {isFrase ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={bodyText + String(display.isTranslated)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`mb-4 flex-1 transition-opacity duration-200 ${
                    translating ? 'opacity-55' : 'opacity-100'
                  }`}
                >
                  <Link
                    to={detailPath}
                    className={cardTitleLinkClass(tema, accent, 'frase')}
                  >
                    &ldquo;{bodyText}&rdquo;
                  </Link>
                </motion.div>
              </AnimatePresence>
            ) : (
              <>
                <Link
                  to={detailPath}
                  className={cardTitleLinkClass(tema, accent, 'metafora')}
                >
                  {display.titulo ?? item.titulo}
                </Link>
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
                    {bodyText}
                  </motion.p>
                </AnimatePresence>
              </>
            )}

            <div className="mb-4">
              <Link
                to={detailPath}
                className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${cardReadMoreBtnClass(tema, accent)}`}
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
                className={`text-[9px] font-black px-2.5 py-1 rounded-full border transition-colors ${cardTagClass(accent)}`}
              >
                #{tag.toUpperCase()}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-zinc-500/10">
            <div className={`w-1.5 h-1.5 rounded-full ${cardAccentDotClass(accent)}`} />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-400 to-zinc-600 text-[10px] font-black tracking-widest uppercase truncate">
              {t('common.author')} {item.autor.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mt-8 flex justify-end items-end gap-2 relative z-10 min-h-[3.375rem]">
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
              accent={accent}
              contentId={item.id}
              source={translateSource}
              onDisplayChange={setDisplay}
              onLoadingChange={setTranslating}
              tooltipLabel={t('common.translate')}
            />
          </CardTooltip>

          {isFrase && onEditImage && (
            <CardTooltip text={t('common.edit_image')} tema={tema}>
              <button
                type="button"
                onClick={() => onEditImage(item)}
                className={cardImageBtnClass(accent)}
              >
                <ImageIcon size={18} />
              </button>
            </CardTooltip>
          )}
        </div>

        <div
          className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl transition-colors pointer-events-none ${
            accent === 'pink'
              ? 'bg-pink-500/5 group-hover:bg-pink-500/20'
              : 'bg-[#A855F7]/5 group-hover:bg-[#A855F7]/20'
          }`}
        />
      </div>
    </motion.div>
  );
}
