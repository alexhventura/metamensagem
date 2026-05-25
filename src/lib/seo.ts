/** Configuração central de SEO (Google, Open Graph, URLs canônicas). */

export const SITE_ORIGIN = 'https://metamensagem.com';
export const SITE_NAME = 'Metamensagem';
export const DEFAULT_DESCRIPTION =
  'Frases inspiradoras e metáforas terapêuticas para reflexão, mudança de atitude e compartilhamento. Mente, Mensagem e Mudança.';
export const OG_IMAGE = `${SITE_ORIGIN}/web-app-manifest-512x512.png`;
export const GOOGLE_SITE_VERIFICATION = '5274c569177c382e';

export function slugFromTitulo(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function urlMetafora(id: string, titulo?: string): string {
  const slug = titulo ? slugFromTitulo(titulo) : '';
  return slug
    ? `${SITE_ORIGIN}/metafora/${id}/${slug}`
    : `${SITE_ORIGIN}/metafora/${id}`;
}

export const WEB_SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_ORIGIN,
  description: DEFAULT_DESCRIPTION,
  inLanguage: 'pt-BR',
  publisher: {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/web-app-manifest-512x512.png`,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_ORIGIN}/?text={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};
