import { ChevronLeft } from 'lucide-react';
import { safeHistoryBack } from '../lib/navigateBack';

export default function BackNavButton({
  label,
  fallbackPath = '/',
  className = '',
}: {
  label: string;
  fallbackPath?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => safeHistoryBack(fallbackPath)}
      className={
        className ||
        'text-[10px] uppercase font-black text-[#A855F7] tracking-[0.2em] mb-6 inline-flex items-center gap-2 hover:gap-3 transition-[gap] bg-transparent border-0 p-0 cursor-pointer'
      }
    >
      <ChevronLeft size={14} aria-hidden />
      {label}
    </button>
  );
}
