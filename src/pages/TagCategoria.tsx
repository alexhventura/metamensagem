import React, { useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import Fuse from 'fuse.js';
import {
  extractSlugFromTagUrlSegment,
  filterBancoByTagSlug,
  getRelatedTags,
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

type TagCategoriaProps = {
  tema: string;
  toast: (msg: string) => void;
  banco: ItemConteudo[];
  registry: TagRegistryEntry[];
  ItemCard: React.ComponentType<{
    item: ItemConteudo;
    tema: string;
    toast: (msg: string) => void;
    onEditImage?: (item: ItemConteudo) => void;
  }>;
  AdBanner: React.ComponentType<{ tema: string; placement: string }>;
  MudarMetaSEO: React.ComponentType<{
    title: string;
    description: string;
    jsonLD?: object;
    canonical?: string;
    ogType?: string;
  }>;
  ModalGeradorPost?: React.ComponentType<{
    item: ItemConteudo;
    onClose: () => void;
    toast: (msg: string) => void;
    temaGlobal: string;
  }>;
};

export default function TagCategoriaView({
  tema,
  toast,
  banco,
  registry,
  ItemCard,
  AdBanner,
  MudarMetaSEO,
  ModalGeradorPost,
}: TagCategoriaProps) {
  const { tagSlug: tagSlugParam } = useParams<{ tagSlug: string }>();
  const [busca, setBusca] = useState('');
  const [itensVisiveis, setItensVisiveis] = useState(12);
  const [itemPost, setItemPost] = useState<ItemConteudo | null>(null);

  const resolvedSlug = useMemo(
    () => extractSlugFromTagUrlSegment(tagSlugParam),
    [tagSlugParam]
  );

  const itensDaTag = useMemo(() => {
    if (!resolvedSlug || banco.length === 0) return [];
    return filterBancoByTagSlug(banco, resolvedSlug);
  }, [banco, resolvedSlug]);

  const entry = useMemo(() => {
    if (!resolvedSlug) return undefined;
    return resolveTagEntry(registry, resolvedSlug, itensDaTag.length);
  }, [registry, resolvedSlug, itensDaTag.length]);

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return itensDaTag;
    const fuse = new Fuse(itensDaTag, {
      keys: ['texto', 'titulo', 'autor', 'tags', 'resumo'],
      threshold: 0.35,
      ignoreLocation: true,
    });
    return fuse.search(busca).map((r) => r.item);
  }, [busca, itensDaTag]);

  const displayTag = entry?.tag ?? resolvedSlug ?? '';

  const relacionadas = useMemo(
    () => (entry ? getRelatedTags(registry, entry) : registry.filter((r) => r.slug !== resolvedSlug).slice(0, 8)),
    [registry, entry, resolvedSlug]
  );

  const intro = useMemo(
    () => tagIntroParagraphs(displayTag, itensDaTag.length),
    [displayTag, itensDaTag.length]
  );

  const itensGrid = useMemo(() => {
    const flattened: { tipoItem: 'conteudo' | 'anuncio'; content?: ItemConteudo; id?: string }[] =
      [];
    itensFiltrados.slice(0, itensVisiveis).forEach((item, index) => {
      flattened.push({ tipoItem: 'conteudo', content: item });
      if (index > 0 && (index + 1) % 6 === 0) {
        flattened.push({ tipoItem: 'anuncio', id: `ad-tag-${index}` });
      }
    });
    return flattened;
  }, [itensFiltrados, itensVisiveis]);

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
      className="max-w-5xl w-full mx-auto px-4 py-8 flex-1 flex flex-col"
    >
      <MudarMetaSEO
        title={tagSeoTitle(displayTag)}
        description={tagMetaDescription(displayTag, itensDaTag.length)}
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
              setItensVisiveis(12);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
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
                <ItemCard
                  key={item.id}
                  item={item}
                  tema={tema}
                  toast={toast}
                  onEditImage={ModalGeradorPost ? setItemPost : undefined}
                />
              );
            })
          )}
        </AnimatePresence>
      </div>

      {itensFiltrados.length > itensVisiveis && (
        <button
          type="button"
          onClick={() => setItensVisiveis((p) => p + 12)}
          className="w-full mt-10 py-5 bg-transparent border-2 border-dashed border-zinc-800 rounded-[2rem] text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-[#A855F7] hover:bg-[#A855F7]/5 transition-all"
        >
          Carregar mais mensagens
        </button>
      )}

      <p className="text-center mt-8 text-[10px] font-mono uppercase tracking-widest opacity-40">
        {itensFiltrados.length} {itensFiltrados.length === 1 ? 'mensagem' : 'mensagens'} ·{' '}
        {displayTag}
      </p>

      {itemPost && ModalGeradorPost && (
        <ModalGeradorPost
          item={itemPost}
          onClose={() => setItemPost(null)}
          toast={toast}
          temaGlobal={tema}
        />
      )}
    </motion.article>
  );
}
