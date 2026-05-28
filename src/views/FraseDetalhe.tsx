import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Quote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getFraseCmsBySlugSync,
  loadFrasesCms,
  type FraseCms,
} from '../lib/frasesModel';
import { DEFAULT_DESCRIPTION, SITE_ORIGIN } from '../lib/seo';
import { pathFromTag } from '../lib/tagsSeo';

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

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="py-3 border-b border-zinc-800/80 last:border-0">
      <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </dt>
      <dd className="text-sm text-zinc-300 leading-relaxed">{value}</dd>
    </div>
  );
}

export default function FraseDetalheView({ tema }: { tema: string }) {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [frase, setFrase] = useState<FraseCms | null>(() =>
    slug ? getFraseCmsBySlugSync(slug) ?? null : null
  );
  const [loading, setLoading] = useState(!frase);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-20">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!frase) {
    return (
      <div className="p-20 text-center text-red-400">
        Frase não encontrada.{' '}
        <Link to="/frases" className="text-purple-400 underline">
          Voltar às frases
        </Link>
      </div>
    );
  }

  const canonical = `${SITE_ORIGIN}/frases/${frase.slug}`;
  const description =
    frase.explicacao ||
    `Frase de ${frase.autor_original}${frase.ano_ou_data ? ` (${frase.ano_ou_data})` : ''}.`;

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

      <article
        className={`rounded-[2rem] p-8 md:p-10 border ${
          tema === 'light'
            ? 'bg-white border-zinc-200 shadow-xl'
            : 'bg-[#0a0a0a] border-zinc-800'
        }`}
      >
        <Quote className="text-purple-500 mb-4" size={28} />
        <blockquote
          className={`text-2xl md:text-3xl font-black leading-tight tracking-tight mb-6 ${
            tema === 'light' ? 'text-black' : 'text-white'
          }`}
        >
          &ldquo;{frase.frase_original}&rdquo;
        </blockquote>
        <p className={`text-lg font-bold mb-8 ${tema === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
          — {frase.autor_original}
        </p>

        {frase.explicacao ? (
          <section className="mb-8">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">
              Explicação
            </h2>
            <p className={`text-base leading-relaxed ${tema === 'light' ? 'text-zinc-700' : 'text-zinc-400'}`}>
              {frase.explicacao}
            </p>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            to={pathFromTag(frase.categoria)}
            className="text-xs px-3 py-1 rounded-full border border-purple-500/30 text-purple-400 inline-block"
          >
            #{frase.categoria}
          </Link>
          {frase.contextos.map((c) => (
            <Link
              key={c}
              to={pathFromTag(c)}
              className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-purple-500/40 inline-block"
            >
              #{c}
            </Link>
          ))}
        </div>

        <dl className="rounded-2xl border border-zinc-800/60 p-4 bg-zinc-900/30">
          <MetaRow label="Ano ou data" value={frase.ano_ou_data} />
          <MetaRow label="Nacionalidade" value={frase.nacionalidade} />
          <MetaRow label="Nascimento / falecimento" value={frase.nascimento_falecimento} />
          <MetaRow label="Tipo de autor" value={frase.autor_tipo} />
          <MetaRow label="Fontes" value={frase.fontes} />
          <MetaRow label="Observação" value={frase.observacao} />
          {frase.palavras_chave.length > 0 && (
            <MetaRow label="Palavras-chave" value={frase.palavras_chave.join(', ')} />
          )}
          {frase.informacoes?.ultima_atualizacao && (
            <MetaRow label="Última atualização" value={frase.informacoes.ultima_atualizacao} />
          )}
          {frase.informacoes?.confiabilidade && (
            <MetaRow label="Confiabilidade" value={frase.informacoes.confiabilidade} />
          )}
        </dl>
      </article>
    </motion.div>
  );
}
