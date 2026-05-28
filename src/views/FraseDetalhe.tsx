import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Copy, Image as ImageIcon, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CardTooltip from '../components/CardTooltip';
import { CardTranslateMenu } from '../components/CardTranslateMenu';
import CustomModalGeradorPost from '../components/ModalGeradorPost';
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
  loadFrasesCms,
  fraseToListItem,
  type FraseCms,
} from '../lib/frasesModel';
import { DEFAULT_DESCRIPTION, SITE_ORIGIN } from '../lib/seo';
import { pathFromTag } from '../lib/tagsSeo';
import type { ItemConteudo } from '../types/content';

function MudarMetaSEO({
  title,
  description,
  canonical,
}: {
  title: string;
  description: string;
  canonical: string;
}) {
  useEffect(() => {
    document.title = `${title} | Metamensagem`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', description);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;
  }, [title, description, canonical]);

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
  const { t } = useTranslation();
  const [frase, setFrase] = useState<FraseCms | null>(() =>
    slug ? getFraseCmsBySlugSync(slug) ?? null : null
  );
  const [loading, setLoading] = useState(!frase);
  const [itemPost, setItemPost] = useState<ItemConteudo | null>(null);
  const [display, setDisplay] = useState<CardContentDisplay>({
    texto: '',
    isTranslated: false,
  });
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    loadFrasesCms().then((all) => {
      if (cancel) return;
      const found = all.find((f) => f.slug === slug.toLowerCase());
      setFrase(found ?? null);
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!frase) return;
    setDisplay({ texto: frase.frase_original, isTranslated: false });
  }, [frase?.id, frase?.frase_original]);

  const listItem = useMemo(() => (frase ? fraseToListItem(frase) : null), [frase]);

  const translateSource = useMemo(
    () => (frase ? { texto: frase.frase_original } : { texto: '' }),
    [frase]
  );

  const canonical = frase ? `${SITE_ORIGIN}/frases/${frase.slug}` : '';
  const quoteText = display.texto || frase?.frase_original || '';

  const handleCopy = () => {
    if (!frase) return;
    navigator.clipboard.writeText(`${quoteText} — ${frase.autor_original}`);
    toast(t('common.copied'));
  };

  const handleShare = async () => {
    if (!frase) return;
    const shareUrl = canonical;
    const payload = {
      title: frase.autor_original,
      text: `${quoteText} — ${frase.autor_original}`,
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

  const description =
    frase.explicacao ||
    `Frase de ${frase.autor_original}${frase.ano_ou_data ? ` (${frase.ano_ou_data})` : ''}`;

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
        title={frase.frase_original.slice(0, 70)}
        description={description}
        canonical={canonical}
      />

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
          {/* Bloco principal: frase + autor + ações */}
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
              — {frase.autor_original}
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
                  source={translateSource}
                  onDisplayChange={setDisplay}
                  onLoadingChange={setTranslating}
                  tooltipLabel={t('common.translate')}
                  menuPlacement="top"
                />
              </CardTooltip>

              <CardTooltip text={t('common.edit_image')} tema={tema}>
                <button
                  type="button"
                  onClick={() => setItemPost(listItem)}
                  className={cardImageBtnClass('purple')}
                >
                  <ImageIcon size={18} />
                </button>
              </CardTooltip>
            </div>
          </div>

          {/* Informações adicionais — lavanda no modo claro */}
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
                    {frase.explicacao}
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
