/** Clusters SEO — agrupamentos semânticos (custo zero). */

export interface SeoClusterDef {
  clusterSlug: string;
  clusterTitle: string;
  clusterDescription: string;
  relatedTerms: string[];
}

export const SEO_CLUSTERS: SeoClusterDef[] = [
  {
    clusterSlug: 'frases-sobre-superacao',
    clusterTitle: 'Frases sobre Superação',
    clusterDescription:
      'Citações sobre superação, coragem, persistência e resiliência para momentos difíceis.',
    relatedTerms: [
      'superacao',
      'motivacao',
      'coragem',
      'persistencia',
      'resiliencia',
      'determinacao',
      'forca',
      'vencer',
      'obstaculos',
    ],
  },
  {
    clusterSlug: 'frases-sobre-amor',
    clusterTitle: 'Frases sobre Amor',
    clusterDescription:
      'Frases sobre amor, relacionamento, paixão, casamento e saudade.',
    relatedTerms: ['amor', 'relacionamento', 'paixao', 'casamento', 'saudade', 'romance', 'heart', 'love'],
  },
  {
    clusterSlug: 'frases-sobre-trabalho',
    clusterTitle: 'Frases sobre Trabalho',
    clusterDescription:
      'Mensagens sobre carreira, produtividade, liderança e sucesso profissional.',
    relatedTerms: ['trabalho', 'carreira', 'produtividade', 'lideranca', 'sucesso', 'work', 'career', 'job'],
  },
  {
    clusterSlug: 'frases-sobre-vida',
    clusterTitle: 'Frases sobre Vida',
    clusterDescription: 'Reflexões sobre sentido da vida, escolhas e existência.',
    relatedTerms: ['vida', 'life', 'existencia', 'sentido', 'reflexao', 'tempo', 'momento'],
  },
  {
    clusterSlug: 'frases-sobre-felicidade',
    clusterTitle: 'Frases sobre Felicidade',
    clusterDescription: 'Frases sobre alegria, gratidão e bem-estar.',
    relatedTerms: ['felicidade', 'alegria', 'gratidao', 'happy', 'joy', 'contentamento'],
  },
  {
    clusterSlug: 'frases-sobre-sabedoria',
    clusterTitle: 'Frases sobre Sabedoria',
    clusterDescription: 'Pensamentos de filósofos e autores sobre conhecimento e prudência.',
    relatedTerms: ['sabedoria', 'wisdom', 'filosofia', 'conhecimento', 'aprender', 'verdade'],
  },
  {
    clusterSlug: 'frases-sobre-fe',
    clusterTitle: 'Frases sobre Fé',
    clusterDescription: 'Citações sobre fé, espiritualidade e esperança.',
    relatedTerms: ['fe', 'faith', 'espiritualidade', 'deus', 'oracao', 'esperanca'],
  },
  {
    clusterSlug: 'frases-sobre-familia',
    clusterTitle: 'Frases sobre Família',
    clusterDescription: 'Frases sobre pais, filhos, laços familiares e lar.',
    relatedTerms: ['familia', 'family', 'mae', 'pai', 'filhos', 'parents'],
  },
  {
    clusterSlug: 'frases-sobre-educacao',
    clusterTitle: 'Frases sobre Educação',
    clusterDescription: 'Mensagens sobre aprendizado, escola e crescimento intelectual.',
    relatedTerms: ['educacao', 'education', 'aprendizado', 'estudos', 'escola', 'conhecimento'],
  },
  {
    clusterSlug: 'frases-sobre-lideranca',
    clusterTitle: 'Frases sobre Liderança',
    clusterDescription: 'Citações sobre liderar equipes, visão e responsabilidade.',
    relatedTerms: ['lideranca', 'leadership', 'lider', 'equipe', 'gestao', 'vision'],
  },
];

export function assignClusterSlug(terms: string[]): string {
  const set = new Set(terms.map((t) => t.toLowerCase().replace(/[^a-z0-9-]/g, '')));
  let best = SEO_CLUSTERS[0];
  let bestScore = 0;
  for (const cluster of SEO_CLUSTERS) {
    let score = 0;
    for (const term of cluster.relatedTerms) {
      const k = term.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (set.has(k)) score += 3;
      for (const t of set) {
        if (t.includes(k) || k.includes(t)) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = cluster;
    }
  }
  return best.clusterSlug;
}
