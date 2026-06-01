/** Origem canônica do site (sem barra final). */
export const SITE_ORIGIN = 'https://metamensagem.com';

/**
 * Monta URL absoluta a partir de path relativo ou URL já absoluta no mesmo origin.
 * - Home: `https://metamensagem.com`
 * - Sem `//` duplicado no path
 * - Sem barra final (exceto query string)
 */
export function absoluteUrl(path = ''): string {
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

function joinPath(pathname: string, search: string): string {
  const pathOnly = pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '';
  const base = pathOnly ? `${SITE_ORIGIN}${pathOnly}` : SITE_ORIGIN;
  return search ? `${base}${search}` : base;
}
