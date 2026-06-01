import type { ImageFormat } from './types';
import { FORMAT_ORDER, FORMATS } from './formats';

export default function ImageFormatSelector({
  value,
  onChange,
  tema,
}: {
  value: ImageFormat;
  onChange: (f: ImageFormat) => void;
  tema: string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {FORMAT_ORDER.map((key) => {
        const cfg = FORMATS[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
              active
                ? 'border-[#A855F7] bg-[#A855F7]/15 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                : tema === 'light'
                  ? 'border-zinc-200 bg-white hover:border-purple-300'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-purple-500/50'
            }`}
          >
            <span className={`block text-[11px] font-black uppercase tracking-wide ${active ? 'text-[#A855F7]' : ''}`}>
              {cfg.shortLabel}
            </span>
            <span className={`block text-[10px] mt-0.5 truncate ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {cfg.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
