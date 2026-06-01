export interface QuoteRelations {
  relatedQuotes: string[];
  relatedAuthors: string[];
  relatedCategories: string[];
  relatedContexts: string[];
  relatedThemes: string[];
  relatedKeywords: string[];
  clusterSlug: string;
}

export interface SeoPageDiscover {
  excerpt: string;
  summary: string;
  featuredText: string;
  introText: string;
}

export interface SeoPagePack extends SeoPageDiscover {
  path: string;
  titleSeo: string;
  descriptionSeo: string;
  faqSchema: { question: string; answer: string }[];
  breadcrumbSchema: { name: string; url: string }[];
  openGraph: { title: string; description: string; type: string; url: string };
  twitterCard: { card: string; title: string; description: string };
  jsonLd: Record<string, unknown>;
  entityCount?: number;
  relatedClusters?: string[];
}

export interface ClusterPagePack extends SeoPagePack {
  clusterSlug: string;
  clusterTitle: string;
  clusterDescription: string;
}

export interface SearchIndexPart {
  [term: string]: string[];
}
