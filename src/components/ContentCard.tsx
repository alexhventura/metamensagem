import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BookOpen, Copy, Share2, Sparkles } from 'lucide-react';
import CardTooltip from './CardTooltip';
import PageTranslateButton from './PageTranslateButton';
import { pathFromTag } from '../lib/tagsSeo';
import { frasePath, seoLocaleFromLanguageOriginal } from '../lib/i18nRoutes';
import { detectLanguageOriginal } from '../../lib/i18n/detectLanguage';
import { fraseSlugForUrl, normalizarParaSlug } from '../lib/slug';
import { usePrefetchFrase } from '../hooks/usePrefetchFrase';
import {
  CARD_ACTION_BTN,
  cardAccentDotClass,
  cardAccentForTipo,
  cardImageBtnClass,
  cardNeutralActionClass,
  cardReadMoreBtnClass,
  cardShellClass,
  cardTagClass,
  cardTitleLinkClass,
} from '../lib/cardTheme';
import type { ItemConteudo } from '../types/content';
import { quoteFromItem } from './image-generator/utils/quoteFromItem';
import { trackPhraseEvent } from '../lib/analytics/phrasePopularity';
import type { ImageGeneratorQuote } from './image-generator/types';
import { formatTagForDisplay } from '../lib/tagDisplay';
import { sanitizeTextForTranslation } from '../lib/textSanitize';
import { usePageContentTranslate } from '../hooks/usePageContentTranslate';

export default function ContentCard({
  item,
  tema,
  onGenerateImage,
  toast,
  lazyBelowFold = false,
}: {
  item: ItemConteudo;
  tema: string;
  onGenerateImage?: (quote: ImageGeneratorQuote) => void;
  toast: (msg: string) => void;
  lazyBelowFold?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isFrase = item.tipo === 'frase';
  const accent = cardAccentForTipo(item.tipo);

  const contentSource = useMemo(
    () => ({
      texto: sanitizeTextForTranslation(item.texto),
      titulo: item.titulo ? sanitizeTextForTranslation(item.titulo) : item.titulo,
      resumo: item.resumo ? sanitizeTextForTranslation(item.resumo) : item.resumo,
      autor: item.autor,
    }),
    [item.id, item.texto, item.titulo, item.resumo, item.autor]
  );

  const { display } = usePageContentTranslate({
    id: `card-${item.id}`,
    source: contentSource,
  });

  const detailPath = isFrase
    ? (() => {
        const slug = fraseSlugForUrl(item.slug, item.texto, item.id);
        const def = seoLocaleFromLanguageOriginal(detectLanguageOriginal(item.texto));
        return frasePath(slug, def, def);
      })()
    : `/metafora/${item.id}/${normalizarParaSlug(item.titulo || '')}`;

  const prefetchSlug = isFrase ? fraseSlugForUrl(item.slug, item.texto, item.id) : undefined;
  const { ref: prefetchRef, onMouseEnter: prefetchOnEnter, onFocus: prefetchOnFocus } =
    usePrefetchFrase(prefetchSlug);

  const buttonLabel = isFrase
    ? t('common.learn_more_phrase', { author: item.autor })
    : t('common.read_metaphor_title', { title: display.titulo ?? item.titulo ?? '' });

  const bodyText = isFrase ? display.texto : display.resumo || display.texto;

  const handleCopy = () => {
    const titulo = display.titulo ?? item.titulo;
    const texto = display.texto;
    const textToCopy = isFrase
      ? `${texto} — ${item.autor}`
      : `${titulo}\n\n${texto}\n— ${item.autor}`;
    navigator.clipboard.writeText(textToCopy);
    if (isFrase) {
      trackPhraseEvent(item.slug || item.id, 'copy', {
        phrase_id: item.id,
        category: item.tags?.[0],
      });
    }
    toast(t('common.copied'));
  };

  const handleShare = async () => {
    const titulo = display.titulo ?? item.titulo;
    const text = isFrase ? display.texto : `${titulo}\n\n${display.texto}`;
    const shareUrl = isFrase
      ? `${window.location.origin}/f/${encodeURIComponent(item.id)}`
      : `${window.location.origin}${detailPath}`;
    const sharePayload = isFrase
      ? { title: item.autor, text: `${text} — ${item.autor}`, url: shareUrl }
      : { title: titulo, text, url: shareUrl };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        if (isFrase) {
          trackPhraseEvent(item.slug || item.id, 'share', {
            phrase_id: item.id,
            category: item.tags?.[0],
          });
        }
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }

    await navigator.clipboard.writeText(shareUrl);
    if (isFrase) {
      trackPhraseEvent(item.slug || item.id, 'share', {
        phrase_id: item.id,
        category: item.tags?.[0],
      });
    }
    toast(t('common.link_copied'));
  };

  const neutralAction = cardNeutralActionClass(tema);

  const displayTags = useMemo(
    () =>
      (item.tags || [])
        .map((tag) => formatTagForDisplay(tag, i18n.language))
        .filter((t): t is string => Boolean(t))
        .slice(0, 3),
    [item.tags, i18n.language]
  );

  const linkState = isFrase ? { item } : undefined;
  const shellClass = cardShellClass(tema, accent);

  const cardInner = (
    <div
      ref={isFrase ? prefetchRef : undefined}
      className="p-7 md:p-8 rounded-3xl flex flex-col justify-between relative h-full"
    >
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <span className={`w-1.5 h-1.5 rounded-full ${cardAccentDotClass(accent)}`} />
          <span
            className={`text-[10px] uppercase font-semibold tracking-[0.14em] ${
              tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'
            }`}
          >
            {item.tipo}
          </span>
        </div>

        <div className="flex flex-col flex-1">
          {!isFrase && item.imagem && (
            <img
              src={item.imagem}
              alt={item.titulo}
              loading="lazy"
              className="w-full h-40 object-cover rounded-2xl mb-5 opacity-95"
            />
          )}

          {isFrase ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={bodyText + String(display.isTranslated)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="mb-3 flex-1"
              >
                <Link
                  to={detailPath}
                  state={linkState}
                  onMouseEnter={prefetchOnEnter}
                  onFocus={prefetchOnFocus}
                  className={cardTitleLinkClass(tema, accent, 'frase')}
                >
                  &ldquo;{bodyText}&rdquo;
                </Link>
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              <Link to={detailPath} className={cardTitleLinkClass(tema, accent, 'metafora')}>
                {display.titulo ?? item.titulo}
              </Link>
              <AnimatePresence mode="wait">
                <motion.p
                  key={bodyText + String(display.isTranslated)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`text-[15px] line-clamp-4 leading-relaxed mb-4 flex-1 ${
                    tema === 'light' ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  {bodyText}
                </motion.p>
              </AnimatePresence>
            </>
          )}

          <div className="mb-5">
            <Link
              to={detailPath}
              state={linkState}
              className={`inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide px-0 py-1 rounded-lg transition-colors ${cardReadMoreBtnClass(tema, accent)}`}
            >
              <BookOpen size={14} />
              {buttonLabel}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-auto">
          {displayTags.map((tag) => (
            <Link
              key={tag}
              to={pathFromTag(tag)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${cardTagClass(accent, tema)}`}
            >
              #{tag}
            </Link>
          ))}
        </div>

        <div
          className={`flex items-center gap-2.5 mt-6 pt-5 border-t ${
            tema === 'light' ? 'border-zinc-100' : 'border-zinc-800/80'
          }`}
        >
          <span
            className={`text-[11px] font-medium tracking-wide uppercase truncate ${
              tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'
            }`}
          >
            {t('common.author')} {item.autor}
          </span>
        </div>
      </div>

      <div className="mt-6 flex justify-end items-center gap-1.5 relative z-10">
        <CardTooltip text={t('common.copy')} tema={tema}>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={t('common.copy')}
            className={`${CARD_ACTION_BTN} ${neutralAction}`}
          >
            <Copy size={16} />
          </button>
        </CardTooltip>

        <CardTooltip text={t('common.share')} tema={tema}>
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label={t('common.share')}
            className={`${CARD_ACTION_BTN} ${neutralAction}`}
          >
            <Share2 size={16} />
          </button>
        </CardTooltip>

        <CardTooltip text={t('translate_page.button_short', 'Traduzir página')} tema={tema}>
          <PageTranslateButton tema={tema} accent={accent} />
        </CardTooltip>

        {isFrase && onGenerateImage && (
          <CardTooltip text={t('common.generate_image', 'Gerar Imagem')} tema={tema}>
            <button
              type="button"
              onClick={() =>
                onGenerateImage(
                  quoteFromItem(item, {
                    texto: display.texto,
                    autor: display.autor ?? item.autor,
                  })
                )
              }
              aria-label={t('common.generate_image', 'Gerar Imagem')}
              className={cardImageBtnClass(accent)}
            >
              <Sparkles size={16} />
            </button>
          </CardTooltip>
        )}
      </div>
    </div>
  );

  if (lazyBelowFold) {
    return <div className={shellClass}>{cardInner}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={shellClass}
    >
      {cardInner}
    </motion.div>
  );
}
