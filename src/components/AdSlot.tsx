import { useEffect, useRef, useState } from 'react';
import { observeAdSlot } from '../lib/adsenseLazy';
import { adSlotHasContent, type AdSlotStatus } from '../lib/adSlotDetect';

export type AdPlacement =
  | 'home-in-feed'
  | 'frases-in-feed'
  | 'metaforas-in-feed'
  | 'metafora-detail-footer'
  | 'tag-in-feed';

const DETECT_INTERVAL_MS = 500;
const DETECT_MAX_ATTEMPTS = 10;

/**
 * Slot AdSense sem placeholder visual.
 * Só ocupa espaço no layout quando um anúncio realmente carrega.
 */
export default function AdSlot({
  tema,
  placement,
  onStatus,
}: {
  tema: string;
  placement: AdPlacement;
  onStatus?: (status: AdSlotStatus) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<AdSlotStatus>('detecting');

  useEffect(() => {
    onStatus?.(status);
  }, [onStatus, status]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let attempts = 0;
    let cancelled = false;
    const unobserve = observeAdSlot(el);

    const finish = (next: AdSlotStatus) => {
      if (cancelled) return;
      setStatus(next);
    };

    const tick = () => {
      if (cancelled || !ref.current) return;
      attempts += 1;
      if (adSlotHasContent(ref.current)) {
        finish('visible');
        return;
      }
      if (attempts >= DETECT_MAX_ATTEMPTS) {
        finish('hidden');
        return;
      }
      window.setTimeout(tick, DETECT_INTERVAL_MS);
    };

    window.setTimeout(tick, DETECT_INTERVAL_MS);

    return () => {
      cancelled = true;
      unobserve();
    };
  }, [placement]);

  if (status === 'hidden') return null;

  const detecting = status === 'detecting';

  return (
    <aside
      ref={ref}
      data-mm-ad-zone="adsense-auto-ads"
      data-mm-ad-placement={placement}
      aria-label={detecting ? undefined : 'Publicidade'}
      aria-hidden={detecting}
      className={
        detecting
          ? 'absolute left-[-9999px] top-auto w-px h-px overflow-hidden opacity-0 pointer-events-none'
          : `w-full py-4 ${tema === 'light' ? 'bg-transparent' : 'bg-transparent'}`
      }
      style={detecting ? undefined : { contain: 'layout' }}
    />
  );
}
