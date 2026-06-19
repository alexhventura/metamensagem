import { TEXT_COLOR_OPTIONS, type TextColorChoice } from './colors';

export default function MobileColorGrid({
  value,
  onChange,
  tema,
}: {
  value: TextColorChoice;
  onChange: (color: TextColorChoice) => void;
  tema: string;
}) {
  return (
    <div
      className="mm-color-grid flex flex-wrap gap-2.5"
      role="listbox"
      aria-label="Cor do texto"
    >
      {TEXT_COLOR_OPTIONS.map((opt) => {
        const active = value === opt.id;
        const isAuto = opt.id === 'auto';
        return (
          <button
            key={opt.id}
            type="button"
            role="option"
            aria-selected={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => onChange(opt.id)}
            className={`mm-color-dot relative shrink-0 w-9 h-9 rounded-full border-2 transition-transform active:scale-95 ${
              active
                ? 'border-[#A855F7] ring-2 ring-[#A855F7]/40 scale-105'
                : tema === 'light'
                  ? 'border-zinc-200'
                  : 'border-zinc-700'
            }`}
            style={
              isAuto
                ? {
                    background:
                      'conic-gradient(from 180deg, #A855F7, #22D3EE, #34D399, #FBBF24, #FB7185, #A855F7)',
                  }
                : { backgroundColor: opt.color ?? undefined }
            }
          >
            {isAuto ? (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white drop-shadow">
                A
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
