import { listAllSkins } from './skins/data';
import type { SkinConfig } from './types';

function BackgroundThumb({
  skin,
  collectionEmoji,
  selected,
  recommended,
  onSelect,
}: {
  skin: SkinConfig;
  collectionEmoji: string;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={skin.name}
      aria-label={skin.name}
      className={`mm-bg-thumb snap-start shrink-0 flex flex-col items-center gap-1 transition-transform active:scale-95 ${
        selected ? 'scale-[1.02]' : ''
      }`}
    >
      <span
        className={`relative block w-14 h-[4.25rem] rounded-xl border-2 shadow-md overflow-hidden ${skin.bgClass} ${
          selected
            ? 'border-[#A855F7] ring-2 ring-[#A855F7]/45'
            : recommended
              ? 'border-amber-400/50 ring-1 ring-amber-400/30'
              : 'border-white/20'
        }`}
        style={skin.cardStyle}
      >
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
        <span className="absolute top-1 left-1 text-[10px]" aria-hidden>
          {collectionEmoji}
        </span>
      </span>
      <span
        className={`text-[9px] font-bold text-center leading-tight max-w-[3.75rem] truncate mm-skin-label ${
          selected ? 'text-[#A855F7] mm-skin-label--active' : ''
        }`}
      >
        {skin.name}
      </span>
    </button>
  );
}

export default function MobileBackgroundGrid({
  collectionId,
  skinId,
  recommendedCollectionId,
  recommendedSkinId,
  onSelect,
}: {
  collectionId: string;
  skinId: string;
  recommendedCollectionId?: string;
  recommendedSkinId?: string;
  onSelect: (collectionId: string, skinId: string) => void;
}) {
  const items = listAllSkins();

  return (
    <div className="mm-bg-grid -mx-1 px-1 flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory">
      {items.map(({ collectionId: colId, collectionEmoji, skin }) => (
        <BackgroundThumb
          key={`${colId}-${skin.id}`}
          skin={skin}
          collectionEmoji={collectionEmoji}
          selected={colId === collectionId && skin.id === skinId}
          recommended={colId === recommendedCollectionId && skin.id === recommendedSkinId}
          onSelect={() => onSelect(colId, skin.id)}
        />
      ))}
    </div>
  );
}
