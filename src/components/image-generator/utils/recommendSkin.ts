import type { ImageGeneratorQuote } from '../types';
import { DEFAULT_COLLECTION_ID, DEFAULT_SKIN_ID } from '../skins/data';

export interface SkinRecommendation {
  collectionId: string;
  skinId: string;
  matched: boolean;
}

const LOVE = [
  'amor', 'amar', 'amado', 'amada', 'paixao', 'paixão', 'coracao', 'coração', 'romance', 'romantico',
  'romântico', 'relacionamento', 'casal', 'namoro', 'casamento', 'carinho', 'beijo',
  'love', 'heart', 'valentine',
];

const MOTIVATION = [
  'motivacao', 'motivação', 'motivacional', 'lideranca', 'liderança', 'coragem', 'foco',
  'disciplina', 'vencer', 'vitoria', 'vitória', 'conquistar', 'persistencia', 'persistência',
  'forca', 'força', 'determinacao', 'determinação', 'goal', 'success', 'win', 'champion',
];

const PHILOSOPHY = [
  'filosofia', 'filosofico', 'filosófico', 'reflexao', 'reflexão', 'existencia', 'existência',
  'sabedoria', 'verdade', 'pensamento', 'sentido', 'stoic', 'estoico', 'philosophy', 'wisdom',
];

const METAPHOR = [
  'metafora', 'metáfora', 'metaforas', 'metáforas', 'simbolo', 'símbolo', 'simbolico', 'simbólico',
  'metaphor', 'symbol', 'allegory',
];

const OVERCOME = [
  'superacao', 'superação', 'superar', 'resiliencia', 'resiliência', 'lutar', 'luta', 'vencer',
  'vencedor', 'overcome', 'resilience', 'strength', 'rise',
];

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildHaystack(quote: ImageGeneratorQuote): string {
  const parts = [
    quote.texto,
    quote.autor,
    quote.categoria ?? '',
    ...(quote.tags ?? []),
    ...(quote.palavrasChave ?? []),
  ];
  return normalizeToken(parts.join(' '));
}

function matchesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => {
    const n = normalizeToken(kw);
    if (n.length <= 3) {
      return haystack.split(/\s+/).some((w) => w === n);
    }
    return haystack.includes(n);
  });
}

export function recommendSkinForQuote(quote: ImageGeneratorQuote): SkinRecommendation {
  const haystack = buildHaystack(quote);

  if (matchesAny(haystack, LOVE)) {
    return { collectionId: 'amor', skinId: 'rosa-suave', matched: true };
  }
  if (matchesAny(haystack, MOTIVATION)) {
    return { collectionId: 'motivacao', skinId: 'aurora', matched: true };
  }
  if (matchesAny(haystack, PHILOSOPHY)) {
    return { collectionId: 'reflexao', skinId: 'neutro', matched: true };
  }
  if (matchesAny(haystack, METAPHOR)) {
    return { collectionId: 'metaforas', skinId: 'atelie', matched: true };
  }
  if (matchesAny(haystack, OVERCOME)) {
    return { collectionId: 'superacao', skinId: 'ascensao', matched: true };
  }

  return {
    collectionId: DEFAULT_COLLECTION_ID,
    skinId: DEFAULT_SKIN_ID,
    matched: false,
  };
}
