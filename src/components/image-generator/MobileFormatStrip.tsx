import type { ImageFormat } from './types';
import { FORMAT_ORDER, FORMATS } from './formats';

const MOBILE_FORMAT_ORDER: ImageFormat[] = [
  'feed',
  'story',
  'portrait',
  'pinterest',
  'twitter',
  'wallpaper_mobile',
];

export default function MobileFormatStrip({
  value,
  onChange,
  tema,
}: {
  value: ImageFormat;
  onChange: (f: ImageFormat) => void;
  tema: string;
}) {
  const keys = FORMAT_ORDER.filter((k) => MOBILE_FORMAT_ORDER.includes(k));

  return (
    <div className="mm-format-strip -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory">
      {keys.map((key) => {
        const cfg = FORMATS[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`snap-start shrink-0 px-3.5 py-2 rounded-full border-2 text-xs font-bold transition-all active:scale-95 ${
              active
                ? 'border-[#A855F7] bg-[#A855F7]/15 text-[#A855F7]'
                : tema === 'light'
                  ? 'border-zinc-200 text-zinc-600 bg-white'
                  : 'border-zinc-800 text-zinc-400 bg-zinc-950/80'
            }`}
          >
            {cfg.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
