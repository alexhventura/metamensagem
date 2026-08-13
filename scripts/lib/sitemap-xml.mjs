/** Limites oficiais do Google Search: 50_000 URLs e 50 MB por sitemap. */
export const SITEMAP_MAX_URLS = 50_000;
export const SITEMAP_MAX_BYTES = 45 * 1024 * 1024;

export function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function urlsetXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}

export function sitemapIndexXml(locs, lastmod = new Date().toISOString().slice(0, 10)) {
  const body = locs
    .map(
      (loc) => `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>
`;
}

/** Divide uma lista de blocos <url>…</url> em lotes de até maxUrls. */
export function chunkEntries(entries, maxUrls = SITEMAP_MAX_URLS) {
  const chunks = [];
  for (let i = 0; i < entries.length; i += maxUrls) {
    chunks.push(entries.slice(i, i + maxUrls));
  }
  return chunks.length ? chunks : [[]];
}
