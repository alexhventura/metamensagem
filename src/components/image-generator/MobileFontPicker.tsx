import { IMAGE_FONT_OPTIONS, type ImageFontId } from './fonts';

export default function MobileFontPicker({
  value,
  onChange,
  sample,
  tema,
}: {
  value: ImageFontId;
  onChange: (id: ImageFontId) => void;
  sample: string;
  tema: string;
}) {
  const preview = sample.length > 28 ? `${sample.slice(0, 28)}…` : sample;

  return (
    <div className="mm-font-picker -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory">
      {IMAGE_FONT_OPTIONS.map((font) => {
        const active = value === font.id;
        return (
          <button
            key={font.id}
            type="button"
            onClick={() => onChange(font.id)}
            className={`mm-font-picker-item snap-start shrink-0 min-w-[8.5rem] max-w-[9.5rem] px-3 py-2.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
              active
                ? 'border-[#A855F7] bg-[#A855F7]/15 shadow-[0_0_16px_rgba(168,85,247,0.2)]'
                : tema === 'light'
                  ? 'border-zinc-200 bg-white'
                  : 'border-zinc-800 bg-zinc-950/80'
            }`}
          >
            <span
              className={`block text-sm font-bold leading-tight truncate ${active ? 'text-[#A855F7]' : ''}`}
              style={{ fontFamily: font.family }}
            >
              {font.label}
            </span>
            <span
              className={`block text-[11px] mt-1 leading-snug line-clamp-2 ${
                tema === 'light' ? 'text-zinc-600' : 'text-zinc-400'
              }`}
              style={{ fontFamily: font.family }}
            >
              {preview}
            </span>
          </button>
        );
      })}
    </div>
  );
}
