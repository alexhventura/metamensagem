import { COLLECTION_GROUPS, findCollection } from './skins/data';

export default function CollectionSelector({
  value,
  onChange,
  tema,
}: {
  value: string;
  onChange: (id: string) => void;
  tema: string;
}) {
  return (
    <div className="space-y-4">
      {COLLECTION_GROUPS.map((group) => (
        <div key={group.title}>
          <p
            className={`text-[9px] font-black uppercase tracking-[0.28em] mb-2 ${
              tema === 'light' ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            {group.title}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.collectionIds.map((id) => {
              const col = findCollection(id);
              const active = value === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => onChange(col.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 text-xs font-bold transition-all ${
                    active
                      ? 'border-[#A855F7] bg-[#A855F7]/20 text-[#A855F7]'
                      : tema === 'light'
                        ? 'border-zinc-200 text-zinc-600 hover:border-purple-300'
                        : 'border-zinc-800 text-zinc-400 hover:border-purple-500/40'
                  }`}
                >
                  <span aria-hidden>{col.emoji}</span>
                  {col.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
