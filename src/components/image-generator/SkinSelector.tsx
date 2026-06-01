import { findCollection } from './skins/data';
import type { SkinConfig, SkinEngagementBadge } from './types';

const ENGAGEMENT_LABEL: Record<SkinEngagementBadge, string> = {
  popular: '🔥 Popular',
  new: '✨ Novo',
  exclusive: '💎 Exclusivo',
};

function SkinSwatch({
  skin,
  selected,
  recommended,
  onSelect,
}: {
  skin: SkinConfig;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={skin.name}
      className={`relative flex flex-col items-center gap-1.5 min-w-[4.75rem] transition-transform hover:scale-105 ${
        selected ? 'scale-105' : ''
      }`}
    >
      <span className="relative">
        <span
          className={`block w-12 h-12 rounded-full border-2 shadow-lg ${skin.bgClass} ${
            selected ? 'border-[#A855F7] ring-2 ring-[#A855F7]/50' : 'border-white/20'
          } ${recommended && !selected ? 'ring-2 ring-amber-400/40' : ''}`}
          style={skin.cardStyle}
        />
        {skin.engagement && (
          <span className="absolute -top-1 -right-1 text-[8px] leading-none px-1 py-0.5 rounded-md bg-black/75 text-white font-bold whitespace-nowrap shadow">
            {ENGAGEMENT_LABEL[skin.engagement].split(' ')[0]}
          </span>
        )}
      </span>
      <span
        className={`text-[9px] font-bold text-center leading-tight max-w-[4.75rem] ${
          selected ? 'text-[#A855F7]' : 'text-zinc-500'
        }`}
      >
        {skin.name}
      </span>
      {skin.engagement && (
        <span className="text-[7px] font-semibold text-zinc-500 -mt-1">
          {ENGAGEMENT_LABEL[skin.engagement]}
        </span>
      )}
    </button>
  );
}

export default function SkinSelector({
  collectionId,
  value,
  recommendedSkinId,
  onChange,
}: {
  collectionId: string;
  value: string;
  recommendedSkinId?: string;
  onChange: (skinId: string) => void;
}) {
  const col = findCollection(collectionId);

  return (
    <div className="flex flex-wrap gap-3 justify-start py-1">
      {col.skins.map((skin) => (
        <SkinSwatch
          key={skin.id}
          skin={skin}
          selected={value === skin.id}
          recommended={recommendedSkinId === skin.id}
          onSelect={() => onChange(skin.id)}
        />
      ))}
    </div>
  );
}
