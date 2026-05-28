import React, { useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { searchBancoSemantico } from '../lib/semanticSearch';
import {
  extractSlugFromTagUrlSegment,
  isTagCategoryPath,
  pathFromTag,
  resolveTagEntry,
  tagIntroParagraphs,
  tagMetaDescription,
  tagPageJsonLd,
  tagPageTitle,
  tagSeoTitle,
  urlFromTag,
  type TagRegistryEntry,
} from '../lib/tagsSeo';
import {
  filterAndRankBancoForTagPage,
  getSemanticRelatedTags,
  relatedTagLabels,
} from '../lib/tagSemantics';
import { GRID_CONTENT } from '../lib/contentGrid';
import { flattenFeedWithAds } from '../lib/feedWithAds';
import type { ItemConteudo } from '../types/content';
import ContentCard from '../components/ContentCard';

type TagCategoriaProps = {
  tema: string;
  toast: (msg: string) => void;
  banco: ItemConteudo[];
  registry: TagRegistryEntry[];
  AdBanner: React.ComponentType<{ tema: string; placement: string }>;
  MudarMetaSEO: React.ComponentType<{
    title: string;
    description: string;
    jsonLD?: object;
    canonical?: string;
    ogType?: string;
  }>;
};

export default function TagCategoriaView({
  tema,
  toast,
  banco,
  registry,
  AdBanner,
  MudarMetaSEO,
}: TagCategoriaProps) {
  const { tagSlug: tagSlugParam } = useParams<{ tagSlug: string }>();
  const [busca, setBusca] = useState('');
  const [itensVisiveis, setItensVisiveis] = useState(24);

  const resolvedSlug = useMemo(
    () => extractSlugFromTagUrlSegment(tagSlugParam),
    [tagSlugParam]
  );

  const rankedItems = useMemo(() => {
    if (!resolvedSlug || banco.length === 0) return [];
    return filterAndRankBancoForTagPage(banco, resolvedSlug, registry);
  }, [banco, resolvedSlug, registry]);

  const itensDaTag = useMemo(
    () => rankedItems.map((r) => r.item),
    [rankedItems]
  );

  const matchStats = useMemo(() => {
    const stats = { primary: 0, related: 0, keyword: 0 };
    for (const r of rankedItems) {
      if (r.matchKind === 'primary') stats.primary += 1;
      else if (r.matchKind === 'related') stats.related += 1;
      else stats.keyword += 1;
    }
    return stats;
  }, [rankedItems]);

  const entry = useMemo(() => {
    if (!resolvedSlug) return undefined;
    return resolveTagEntry(registry, resolvedSlug, itensDaTag.length);
  }, [registry, resolvedSlug, itensDaTag.length]);

  const labelsRelacionados = useMemo(
    () => (resolvedSlug ? relatedTagLabels(registry, resolvedSlug, 6) : []),
    [registry, resolvedSlug]
  );

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return itensDaTag;
    return searchBancoSemantico(itensDaTag, busca);
  }, [busca, itensDaTag]);

  const displayTag = entry?.tag ?? resolvedSlug ?? '';

  const relacionadas = useMemo(
    () =>
      resolvedSlug
        ? getSemanticRelatedTags(registry, resolvedSlug, 10)
        : registry.filter((r) => r.slug !== resolvedSlug).slice(0, 8),
    [registry, resolvedSlug]
  );

  const intro = useMemo(
    () => tagIntroParagraphs(displayTag, itensDaTag.length, matchStats, labelsRelacionados),
    [displayTag, itensDaTag.length, matchStats, labelsRelacionados]
  );

  const itensGrid = useMemo(
    () =>
      flattenFeedWithAds(itensFiltrados.slice(0, itensVisiveis), (content) => ({
        tipoItem: 'conteudo',
        content,
      })),
    [itensFiltrados, itensVisiveis]
  );

  if (!tagSlugParam || !isTagCategoryPath(tagSlugParam)) {
    return <Navigate to="/" replace />;
  }

  if (!resolvedSlug) {
    return <Navigate to="/" replace />;
  }

  const canonical = urlFromTag(entry?.tag ?? displayTag);

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 flex flex-col"
    >
      <MudarMetaSEO
        title={tagSeoTitle(displayTag)}
        description={tagMetaDescription(displayTag, itensDaTag.length, labelsRelacionados)}
        canonical={canonical}
        jsonLD={tagPageJsonLd(entry ?? { tag: displayTag, slug: resolvedSlug, aliases: [], count: itensDaTag.length }, itensDaTag.length)}
        ogType="website"
      />

      <header className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-black mb-6 tracking-tighter leading-tight">
          {tagPageTitle(displayTag)}
        </h1>

        <div className="relative max-w-2xl mx-auto">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500"
            size={20}
          />
          <input
            type="search"
            placeholder={`Buscar em ${displayTag}...`}
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setItensVisiveis(24);
            }}
            className={`w-full py-4 pl-14 pr-6 rounded-[2rem] border-2 font-medium outline-none transition-all shadow-lg ${
              tema === 'light'
                ? 'bg-white border-zinc-100 text-black focus:border-[#A855F7] shadow-zinc-200'
                : 'bg-zinc-900 border-zinc-800 text-white focus:border-[#A855F7] shadow-black/50'
            }`}
            aria-label={`Buscar mensagens de ${displayTag}`}
          />
        </div>
      </header>

      <section
        className={`max-w-3xl mx-auto mb-12 space-y-4 text-sm md:text-base leading-relaxed ${
          tema === 'light' ? 'text-zinc-600' : 'text-zinc-400'
        }`}
        aria-label="Sobre esta categoria"
      >
        {intro.map((paragrafo, i) => (
          <p key={i}>{paragrafo}</p>
        ))}
      </section>

      {relacionadas.length > 0 && (
        <nav
          className="mb-10"
          aria-label="Categorias relacionadas"
        >
          <p
            className={`text-center text-[10px] font-black uppercase tracking-[0.35em] mb-4 ${
              tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'
            }`}
          >
            Temas relacionados
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {relacionadas.map((rel) => (
              <Link
                key={rel.slug}
                to={pathFromTag(rel.tag)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                  tema === 'light'
                    ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:border-[#A855F7] hover:text-[#A855F7]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-[#A855F7] hover:text-[#A855F7]'
                }`}
              >
                #{rel.tag}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <div className={GRID_CONTENT}>
        <AnimatePresence mode="popLayout">
          {itensGrid.length === 0 ? (
            <div
              className={`col-span-full text-center py-16 px-4 text-sm space-y-4 ${
                tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'
              }`}
            >
              <p>
                {busca.trim()
                  ? 'Nenhum resultado para esta busca nesta categoria.'
                  : `Ainda não há mensagens publicadas para «${displayTag}», mas você pode explorar temas relacionados acima.`}
              </p>
              <Link to="/" className="text-[#A855F7] font-bold hover:underline inline-block">
                Voltar ao início
              </Link>
            </div>
          ) : (
            itensGrid.map((itemObj) => {
              if (itemObj.tipoItem === 'anuncio') {
                return (
                  <motion.div
                    key={itemObj.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full"
                  >
                    <AdBanner tema={tema} placement="tag-in-feed" />
                  </motion.div>
                );
              }
              const item = itemObj.content!;
              return (
                <ContentCard
                  key={item.id}
                  item={item}
                  tema={tema}
                  toast={toast}
                />
              );
            })
          )}
        </AnimatePresence>
      </div>

      {itensFiltrados.length > itensVisiveis && (
        <button
          type="button"
          onClick={() => setItensVisiveis((p) => p + 16)}
          className="w-full mt-10 py-5 bg-transparent border-2 border-dashed border-zinc-800 rounded-[2rem] text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-[#A855F7] hover:bg-[#A855F7]/5 transition-all"
        >
          Carregar mais mensagens
        </button>
      )}

      <p className="text-center mt-8 text-[10px] font-mono uppercase tracking-widest opacity-40">
        {itensFiltrados.length} {itensFiltrados.length === 1 ? 'mensagem' : 'mensagens'} · {displayTag}
        {matchStats.primary > 0 && ` · ${matchStats.primary} diretas`}
        {matchStats.related > 0 && ` · ${matchStats.related} relacionadas`}
      </p>

    </motion.article>
  );
}
