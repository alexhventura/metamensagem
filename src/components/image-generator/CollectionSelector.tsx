import { COLLECTIONS } from './skins/data';

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
    <div className="flex flex-wrap gap-2">
      {COLLECTIONS.map((col) => {
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
  );
}
