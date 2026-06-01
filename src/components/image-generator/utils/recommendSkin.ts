import type { ImageGeneratorQuote } from '../types';
import { DEFAULT_COLLECTION_ID, DEFAULT_SKIN_ID } from '../skins/data';

export interface SkinRecommendation {
  collectionId: string;
  skinId: string;
  /** Recomendação contextual (não é o default oficial). */
  matched: boolean;
}

const LOVE = [
  'amor', 'amar', 'amado', 'amada', 'paixao', 'paixão', 'coracao', 'coração', 'romance', 'romantico',
  'romântico', 'relacionamento', 'casal', 'namoro', 'casamento', 'carinho', 'beijo', 'seducao', 'sedução',
  'love', 'heart', 'valentine', 'crush', 'boyfriend', 'girlfriend',
];

const MONEY = [
  'dinheiro', 'riqueza', 'rico', 'rica', 'prosperidade', 'prosperar', 'sucesso', 'fortuna', 'milionario',
  'milionário', 'negocio', 'negócio', 'investimento', 'lucro', 'emprego', 'carreira', 'salario', 'salário',
  'wealth', 'money', 'rich', 'millionaire', 'profit', 'business',
];

const MOTIVATION = [
  'motivacao', 'motivação', 'motivacional', 'lideranca', 'liderança', 'lider', 'líder', 'coragem', 'foco',
  'disciplina', 'vencer', 'vitoria', 'vitória', 'conquistar', 'superacao', 'superação', 'persistencia',
  'persistência', 'forca', 'força', 'determinacao', 'determinação', 'ambicao', 'ambição', 'goal', 'success',
  'leader', 'leadership', 'win', 'champion',
];

const PHILOSOPHY = [
  'filosofia', 'filosofico', 'filosófico', 'reflexao', 'reflexão', 'existencia', 'existência', 'existencial',
  'sabedoria', 'verdade', 'pensamento', 'pensar', 'sentido', 'vida', 'morte', 'tempo', 'destino', 'stoic',
  'estoico', 'epicteto', 'seneca', 'socrates', 'platao', 'platão', 'nietzsche', 'philosophy', 'wisdom',
];

const SPIRITUAL = [
  'espiritual', 'espiritualidade', 'paz', 'meditacao', 'meditação', 'alma', 'deus', 'fe', 'fé', 'oracao',
  'oração', 'gratidao', 'gratidão', 'zen', 'nirvana', 'chakra', 'mantra', 'silencio', 'silêncio', 'interior',
  'spiritual', 'peace', 'meditation', 'soul', 'prayer', 'faith', 'buddha', 'yoga',
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
    return { collectionId: 'paises', skinId: 'parisienne', matched: true };
  }
  if (matchesAny(haystack, MONEY)) {
    return { collectionId: 'fortuna', skinId: 'ouro', matched: true };
  }
  if (matchesAny(haystack, MOTIVATION)) {
    return { collectionId: 'lendario', skinId: 'premium', matched: true };
  }
  if (matchesAny(haystack, PHILOSOPHY)) {
    return { collectionId: 'filosofia', skinId: 'estoico', matched: true };
  }
  if (matchesAny(haystack, SPIRITUAL)) {
    return { collectionId: 'paises', skinId: 'maharaja', matched: true };
  }

  return {
    collectionId: DEFAULT_COLLECTION_ID,
    skinId: DEFAULT_SKIN_ID,
    matched: false,
  };
}
