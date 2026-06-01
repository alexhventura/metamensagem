import { useEffect, useRef } from 'react';
import { observeAdSlot } from '../lib/adsenseLazy';

type Placement =
  | 'home-in-feed'
  | 'frases-in-feed'
  | 'metaforas-in-feed'
  | 'metafora-detail-footer'
  | 'tag-in-feed';

/**
 * Placeholder com dimensões fixas (CLS) + lazy AdSense via IntersectionObserver.
 */
export default function AdSlot({ tema, placement }: { tema: string; placement: Placement }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observeAdSlot(el);
  }, []);

  return (
    <aside
      ref={ref}
      data-mm-ad-zone="adsense-auto-ads"
      data-mm-ad-placement={placement}
      aria-label="Área de publicidade"
      className={`w-full min-h-[250px] py-10 px-6 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${
        tema === 'light' ? 'bg-zinc-100 border-zinc-200 text-zinc-400' : 'bg-zinc-950 border-zinc-900 text-zinc-700'
      }`}
      style={{ contain: 'layout' }}
    >
      <span className="text-[10px] font-mono tracking-[0.5em] uppercase mb-2 pointer-events-none select-none">
        Espaço para Monetização
      </span>
      <p className="text-[9px] opacity-40 uppercase tracking-widest pointer-events-none select-none">
        Publicidade Responsiva MM
      </p>
    </aside>
  );
}
