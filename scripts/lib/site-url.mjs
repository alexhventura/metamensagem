/** Espelho de lib/seo/url.ts para scripts Node. */
export const SITE_ORIGIN = 'https://metamensagem.com';

export function absoluteUrl(path = '') {
  const trimmed = String(path ?? '').trim();
  if (!trimmed || trimmed === '/') return SITE_ORIGIN;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      if (u.origin !== SITE_ORIGIN) return trimmed.replace(/([^:]\/)\/+/g, '$1');
      return joinPath(u.pathname, u.search);
    } catch {
      return trimmed;
    }
  }

  const pathname = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const q = pathname.indexOf('?');
  if (q === -1) return joinPath(pathname, '');
  return joinPath(pathname.slice(0, q), pathname.slice(q));
}

function joinPath(pathname, search) {
  const pathOnly = pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '';
  const base = pathOnly ? `${SITE_ORIGIN}${pathOnly}` : SITE_ORIGIN;
  return search ? `${base}${search}` : base;
}
