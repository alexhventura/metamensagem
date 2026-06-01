/**
 * Injeta link[rel=alternate][hreflang] no documento (SPA).
 */

const LINK_ID_PREFIX = 'mm-hreflang-';

export function applyHreflangLinks(links: { hreflang: string; href: string }[]): void {
  document.querySelectorAll(`link[id^="${LINK_ID_PREFIX}"]`).forEach((el) => el.remove());

  for (const { hreflang, href } of links) {
    let link = document.getElementById(`${LINK_ID_PREFIX}${hreflang}`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = `${LINK_ID_PREFIX}${hreflang}`;
      link.rel = 'alternate';
      document.head.appendChild(link);
    }
    link.hreflang = hreflang;
    link.href = href;
  }
}
