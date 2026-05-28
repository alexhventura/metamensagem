import React from 'react';
import { FraseCard } from '../components/FraseCard';

/** Grid 3 colunas desktop, 2 tablet, 1 mobile */
export const GRID_CONTENT =
  'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6 items-stretch';

export type GridItem = {
  id: string;
  tipo: 'frase' | 'metafora';
  texto: string;
  autor: string;
  slug?: string;
  tags?: string[];
  titulo?: string;
  resumo?: string;
  imagem?: string;
};

type RenderCardOpts = {
  item: GridItem;
  tema: string;
  toast: (msg: string) => void;
  onEditImage?: (item: GridItem) => void;
  ItemCard: React.ComponentType<{
    item: GridItem;
    tema: string;
    toast: (msg: string) => void;
    onEditImage?: (item: GridItem) => void;
  }>;
};

export function renderContentCard({ item, tema, toast, onEditImage, ItemCard }: RenderCardOpts) {
  if (item.tipo === 'frase') {
    const slug =
      item.slug ||
      item.id.replace(/^f_/, '') ||
      item.texto.slice(0, 40).toLowerCase().replace(/\s+/g, '-');
    return (
      <FraseCard
        frase={{
          slug,
          frase_original: item.texto,
          autor_original: item.autor,
        }}
        tema={tema}
      />
    );
  }
  return <ItemCard item={item} tema={tema} toast={toast} onEditImage={onEditImage} />;
}
