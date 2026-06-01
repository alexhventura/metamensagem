import { SITE_ORIGIN, SITE_NAME, absoluteUrl } from '../constants';
import type { SeoClusterDef } from '../clusters';
import type { ClusterPagePack, SeoPagePack } from './types';

function label(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildClusterPage(cluster: SeoClusterDef, quoteCount: number): ClusterPagePack {
  const path = `/frases-sobre/${cluster.clusterSlug}`;
  const url = absoluteUrl(path);
  const n = Math.min(quoteCount, 99);
  const titleSeo = `${n}+ ${cluster.clusterTitle} para Inspirar sua Jornada | ${SITE_NAME}`;
  const introText = `Selecionamos ${cluster.clusterTitle.toLowerCase()} para ajudar você a refletir, compartilhar e encontrar a mensagem certa no momento certo.`;
  const descriptionSeo = `${introText} Explore ${quoteCount} citações curadas.`.slice(0, 160);

  return {
    path,
    clusterSlug: cluster.clusterSlug,
    clusterTitle: cluster.clusterTitle,
    clusterDescription: cluster.clusterDescription,
    titleSeo,
    descriptionSeo,
    excerpt: descriptionSeo,
    summary: cluster.clusterDescription,
    featuredText: introText,
    introText,
    entityCount: quoteCount,
    faqSchema: [
      {
        question: `O que são ${cluster.clusterTitle.toLowerCase()}?`,
        answer: cluster.clusterDescription,
      },
      {
        question: 'Posso copiar e compartilhar as frases?',
        answer: 'Sim. Cada frase tem página própria com texto original preservado e opções de compartilhamento.',
      },
    ],
    breadcrumbSchema: [
      { name: 'Início', url: SITE_ORIGIN },
      { name: 'Frases', url: absoluteUrl('/frases') },
      { name: cluster.clusterTitle, url },
    ],
    openGraph: { title: titleSeo, description: descriptionSeo, type: 'website', url },
    twitterCard: { card: 'summary_large_image', title: titleSeo, description: descriptionSeo },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: cluster.clusterTitle,
      description: cluster.clusterDescription,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_ORIGIN },
      numberOfItems: quoteCount,
    },
    relatedClusters: [],
  };
}

export function buildEntityPage(
  kind: 'autor' | 'categoria' | 'contexto' | 'emocao' | 'tema' | 'keyword',
  slug: string,
  nome: string,
  count: number
): SeoPagePack {
  const segment =
    kind === 'autor'
      ? 'autor'
      : kind === 'categoria'
        ? 'categoria'
        : kind === 'contexto'
          ? 'contexto'
          : kind === 'emocao'
            ? 'emocao'
            : kind === 'tema'
              ? 'tema'
              : 'keyword';
  const path = `/${segment}/${slug}`;
  const url = absoluteUrl(path);
  const titleSeo = `Frases de ${nome} — ${count} citações | ${SITE_NAME}`;
  const introText = `Explore ${count} frases sobre ${nome.toLowerCase()} no Metamensagem.`;
  const descriptionSeo = introText.slice(0, 158);

  return {
    path,
    titleSeo,
    descriptionSeo,
    excerpt: descriptionSeo,
    summary: introText,
    featuredText: count > 0 ? `"${nome}" reúne ${count} mensagens para leitura e compartilhamento.` : '',
    introText,
    entityCount: count,
    faqSchema: [
      { question: `Quantas frases de ${nome} existem?`, answer: `${count} citações indexadas.` },
    ],
    breadcrumbSchema: [
      { name: 'Início', url: SITE_ORIGIN },
      { name: label(segment), url: absoluteUrl(`/${segment}`) },
      { name: nome, url },
    ],
    openGraph: { title: titleSeo, description: descriptionSeo, type: 'website', url },
    twitterCard: { card: 'summary', title: titleSeo, description: descriptionSeo },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Frases — ${nome}`,
      url,
      numberOfItems: count,
    },
  };
}
