/** Detecta se um slot recebeu criativo AdSense / Auto Ads. */
export function adSlotHasContent(el: HTMLElement): boolean {
  const ins = el.querySelector('ins.adsbygoogle');
  if (ins?.getAttribute('data-ad-status') === 'filled') return true;
  if (ins && ins.offsetHeight > 40) return true;

  const iframe = el.querySelector('iframe');
  if (iframe && iframe.offsetHeight > 40) return true;

  if (el.querySelector('[data-google-query-id], [id^="google_ads_iframe"]')) return true;

  return el.offsetHeight > 80 && el.textContent?.trim().length === 0;
}

export type AdSlotStatus = 'detecting' | 'visible' | 'hidden';
