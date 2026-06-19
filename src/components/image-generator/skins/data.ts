import type { CollectionConfig, SkinConfig } from '../types';
import { SEMANTIC_COLLECTIONS } from './semanticCollections';

const LEGACY_COLLECTIONS: CollectionConfig[] = [
  {
    id: 'elementos',
    name: 'Elementos',
    emoji: '🌍',
    theme: 'Forças da natureza',
    skins: [
      {
        id: 'terra',
        name: 'Terra',
        bgClass: 'bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900',
        textClass: 'text-amber-50',
        accentClass: 'text-amber-200/80',
        borderClass: 'border-amber-700/40',
      },
      {
        id: 'agua',
        name: 'Água',
        bgClass: 'bg-gradient-to-br from-cyan-950 via-teal-900 to-blue-950',
        textClass: 'text-cyan-50',
        accentClass: 'text-teal-200/75',
        borderClass: 'border-cyan-600/30',
      },
      {
        id: 'ar',
        name: 'Ar',
        bgClass: 'bg-gradient-to-br from-sky-200 via-slate-100 to-zinc-300',
        textClass: 'text-slate-800',
        accentClass: 'text-slate-600/90',
        borderClass: 'border-white/60',
      },
      {
        id: 'fogo',
        name: 'Fogo',
        bgClass: 'bg-gradient-to-br from-orange-600 via-red-700 to-black',
        textClass: 'text-orange-50',
        accentClass: 'text-orange-200/80',
        borderClass: 'border-orange-500/35',
      },
    ],
  },
  {
    id: 'fortuna',
    name: 'Fortuna',
    emoji: '💎',
    theme: 'Metais preciosos',
    skins: [
      {
        id: 'ouro',
        name: 'Ouro',
        bgClass: 'bg-gradient-to-br from-yellow-700 via-amber-500 to-yellow-900',
        textClass: 'text-yellow-50',
        accentClass: 'text-amber-100/85',
        borderClass: 'border-yellow-300/40',
        cardStyle: { boxShadow: 'inset 0 0 80px rgba(255,215,0,0.15)' },
        engagement: 'popular',
      },
      {
        id: 'prata',
        name: 'Prata',
        bgClass: 'bg-gradient-to-br from-zinc-300 via-zinc-100 to-zinc-500',
        textClass: 'text-zinc-900',
        accentClass: 'text-zinc-700/90',
        borderClass: 'border-white/70',
      },
      {
        id: 'diamante',
        name: 'Diamante',
        bgClass: 'bg-gradient-to-br from-sky-100 via-white to-indigo-200',
        textClass: 'text-slate-800',
        accentClass: 'text-indigo-600/80',
        borderClass: 'border-sky-200/80',
        engagement: 'exclusive',
      },
      {
        id: 'safira',
        name: 'Safira',
        bgClass: 'bg-gradient-to-br from-blue-950 via-indigo-950 to-black',
        textClass: 'text-blue-100',
        accentClass: 'text-indigo-300/75',
        borderClass: 'border-blue-500/35',
      },
    ],
  },
  {
    id: 'lendario',
    name: 'Lendário',
    emoji: '👑',
    theme: 'Coleção exclusiva',
    skins: [
      {
        id: 'metamensagem',
        name: 'Metamensagem Oficial',
        bgClass: 'bg-gradient-to-br from-[#7C3AED] via-[#A855F7] to-black',
        textClass: 'text-white',
        accentClass: 'text-purple-200/85',
        borderClass: 'border-purple-400/40',
        cardStyle: { boxShadow: '0 0 120px rgba(168,85,247,0.35)' },
        engagement: 'exclusive',
      },
      {
        id: 'raro',
        name: 'Raro',
        bgClass: 'bg-gradient-to-br from-orange-500 via-orange-700 to-black',
        textClass: 'text-orange-50',
        accentClass: 'text-orange-200/80',
        borderClass: 'border-orange-400/35',
        engagement: 'new',
      },
      {
        id: 'premium',
        name: 'Premium',
        bgClass: 'bg-gradient-to-br from-zinc-900 via-black to-red-950',
        textClass: 'text-white',
        accentClass: 'text-red-300/80',
        borderClass: 'border-red-500/30',
        engagement: 'popular',
      },
      {
        id: 'chromo',
        name: 'Chromo',
        bgClass: 'bg-gradient-to-br from-zinc-400 via-zinc-200 to-zinc-600',
        textClass: 'text-zinc-900',
        accentClass: 'text-zinc-700',
        borderClass: 'border-white/80',
        cardStyle: {
          backgroundImage:
            'linear-gradient(135deg, #e4e4e7 0%, #fafafa 25%, #a1a1aa 50%, #fafafa 75%, #71717a 100%)',
        },
        engagement: 'new',
      },
    ],
  },
  {
    id: 'paises',
    name: 'Países',
    emoji: '🌐',
    theme: 'Identidades culturais',
    skins: [
      {
        id: 'american-dream',
        name: 'American Dream',
        bgClass: 'bg-gradient-to-br from-blue-950 via-red-950 to-blue-900',
        textClass: 'text-white',
        accentClass: 'text-blue-200/80',
        borderClass: 'border-red-500/25',
      },
      {
        id: 'brasilidade',
        name: 'Brasilidade',
        bgClass: 'bg-gradient-to-br from-green-700 via-yellow-400 to-green-800',
        textClass: 'text-green-950',
        accentClass: 'text-green-900/85',
        borderClass: 'border-yellow-300/50',
      },
      {
        id: 'parisienne',
        name: 'Parisienne',
        bgClass: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-amber-900/80',
        textClass: 'text-amber-50',
        accentClass: 'text-amber-200/75',
        borderClass: 'border-amber-500/25',
        engagement: 'popular',
      },
      {
        id: 'rinascimento',
        name: 'Rinascimento',
        bgClass: 'bg-gradient-to-br from-emerald-950 via-stone-900 to-amber-800',
        textClass: 'text-amber-50',
        accentClass: 'text-emerald-200/70',
        borderClass: 'border-amber-600/30',
      },
      {
        id: 'sakura',
        name: 'Sakura',
        bgClass: 'bg-gradient-to-br from-rose-50 via-white to-zinc-200',
        textClass: 'text-rose-950',
        accentClass: 'text-rose-700/80',
        borderClass: 'border-rose-200/80',
      },
      {
        id: 'maharaja',
        name: 'Maharaja',
        bgClass: 'bg-gradient-to-br from-amber-600 via-purple-950 to-amber-900',
        textClass: 'text-amber-50',
        accentClass: 'text-purple-200/75',
        borderClass: 'border-amber-400/35',
        engagement: 'exclusive',
      },
    ],
  },
  {
    id: 'universo',
    name: 'Universo',
    emoji: '🌌',
    theme: 'Cosmos infinito',
    skins: [
      {
        id: 'nebulosa',
        name: 'Nebulosa',
        bgClass: 'bg-gradient-to-br from-purple-900 via-fuchsia-800 to-indigo-950',
        textClass: 'text-fuchsia-50',
        accentClass: 'text-purple-200/80',
        borderClass: 'border-fuchsia-400/25',
        engagement: 'popular',
      },
      {
        id: 'galaxia',
        name: 'Galáxia',
        bgClass: 'bg-gradient-to-br from-indigo-950 via-blue-950 to-black',
        textClass: 'text-indigo-100',
        accentClass: 'text-blue-300/70',
        borderClass: 'border-indigo-500/30',
      },
      {
        id: 'eclipse',
        name: 'Eclipse',
        bgClass: 'bg-gradient-to-br from-black via-zinc-900 to-zinc-600',
        textClass: 'text-zinc-100',
        accentClass: 'text-zinc-400/85',
        borderClass: 'border-zinc-500/35',
      },
      {
        id: 'supernova',
        name: 'Supernova',
        bgClass: 'bg-gradient-to-br from-orange-500 via-blue-600 to-indigo-950',
        textClass: 'text-white',
        accentClass: 'text-orange-100/85',
        borderClass: 'border-blue-400/30',
        engagement: 'new',
      },
    ],
  },
  {
    id: 'filosofia',
    name: 'Filosofia',
    emoji: '📜',
    theme: 'Pensamento atemporal',
    skins: [
      {
        id: 'estoico',
        name: 'Estoico',
        bgClass: 'bg-gradient-to-br from-zinc-800 via-zinc-950 to-black',
        textClass: 'text-zinc-100',
        accentClass: 'text-zinc-400/90',
        borderClass: 'border-zinc-600/40',
        engagement: 'popular',
      },
      {
        id: 'zen',
        name: 'Zen',
        bgClass: 'bg-gradient-to-br from-stone-100 via-emerald-50 to-stone-200',
        textClass: 'text-stone-800',
        accentClass: 'text-emerald-800/70',
        borderClass: 'border-emerald-200/70',
      },
      {
        id: 'classico',
        name: 'Clássico',
        bgClass: 'bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200',
        textClass: 'text-amber-950',
        accentClass: 'text-amber-800/85',
        borderClass: 'border-amber-300/60',
      },
      {
        id: 'existencial',
        name: 'Existencial',
        bgClass: 'bg-gradient-to-br from-zinc-950 via-neutral-950 to-black',
        textClass: 'text-neutral-200',
        accentClass: 'text-neutral-500',
        borderClass: 'border-neutral-700/50',
      },
    ],
  },
];

/** Premium primeiro; legado mantido para variedade. */
export const COLLECTIONS: CollectionConfig[] = [...SEMANTIC_COLLECTIONS, ...LEGACY_COLLECTIONS];

/** Grupos para o seletor do modal (emoção vs clássicos). */
export const COLLECTION_GROUPS: { title: string; collectionIds: string[] }[] = [
  {
    title: 'Emoção & intenção',
    collectionIds: SEMANTIC_COLLECTIONS.map((c) => c.id),
  },
  {
    title: 'Estilos clássicos',
    collectionIds: LEGACY_COLLECTIONS.map((c) => c.id),
  },
];

export const DEFAULT_COLLECTION_ID = 'motivacao';
export const DEFAULT_SKIN_ID = 'aurora';

export function findSkin(collectionId: string, skinId: string) {
  const col = COLLECTIONS.find((c) => c.id === collectionId);
  return col?.skins.find((s) => s.id === skinId) ?? COLLECTIONS[0].skins[0];
}

export function findCollection(collectionId: string) {
  return COLLECTIONS.find((c) => c.id === collectionId) ?? COLLECTIONS[0];
}

export function listAllSkins(): { collectionId: string; collectionEmoji: string; skin: SkinConfig }[] {
  return COLLECTIONS.flatMap((c) =>
    c.skins.map((skin) => ({
      collectionId: c.id,
      collectionEmoji: c.emoji,
      skin,
    }))
  );
}
