import { safeLower, safeText, safeTags } from './safeContent';
import { slugFromTag, type ItemComTags, type TagRegistryEntry } from './tagsSeo';

/** Slugs de tags irmãs no mesmo cluster temático (normalizados). */
const SEMANTIC_CLUSTERS: string[][] = [
  ['motivacao', 'inspiracional', 'sucesso', 'persistencia', 'determinacao', 'superacao', 'coragem', 'otimismo', 'foco'],
  ['reflexao', 'sabedoria', 'aprendizado', 'metafora', 'historias'],
  ['amor', 'felicidade', 'fe', 'sonhos', 'coragem'],
  ['estrategia', 'foco', 'sucesso', 'determinacao', 'sabedoria', 'comportamento', 'persistencia', 'motivacao'],
  ['terapeutica', 'cura', 'saude', 'educacao', 'pnl', 'comportamento', 'reflexao'],
  ['bom-dia', 'otimismo', 'felicidade', 'motivacao', 'inspiracional'],
];

/**
 * Sinônimos e temas próximos por slug (complementa clusters e coocorrência).
 * Apenas slugs que existem no acervo devem ser resolvidos em runtime.
 */
export const RELATED_TAGS_MAP: Record<string, string[]> = {
  estrategia: ['foco', 'sucesso', 'determinacao', 'sabedoria', 'comportamento', 'persistencia', 'motivacao', 'aprendizado'],
  amor: ['felicidade', 'fe', 'sonhos', 'coragem', 'inspiracional', 'reflexao'],
  motivacao: ['inspiracional', 'sucesso', 'persistencia', 'determinacao', 'superacao', 'coragem', 'otimismo', 'foco'],
  reflexao: ['sabedoria', 'aprendizado', 'metafora', 'historias', 'motivacao', 'superacao'],
  metafora: ['historias', 'reflexao', 'sabedoria', 'aprendizado', 'terapeutica'],
  sabedoria: ['reflexao', 'aprendizado', 'metafora', 'historias', 'estrategia'],
  sucesso: ['motivacao', 'persistencia', 'determinacao', 'foco', 'superacao', 'coragem'],
  foco: ['persistencia', 'determinacao', 'sucesso', 'motivacao', 'estrategia'],
  persistencia: ['determinacao', 'sucesso', 'motivacao', 'superacao', 'foco'],
  determinacao: ['persistencia', 'sucesso', 'motivacao', 'superacao', 'coragem', 'foco'],
  superacao: ['coragem', 'motivacao', 'persistencia', 'determinacao', 'reflexao'],
  coragem: ['superacao', 'motivacao', 'determinacao', 'amor', 'fe'],
  inspiracional: ['motivacao', 'otimismo', 'sucesso', 'felicidade', 'coragem'],
  otimismo: ['motivacao', 'inspiracional', 'felicidade', 'bom-dia'],
  felicidade: ['amor', 'otimismo', 'fe', 'bom-dia', 'sonhos'],
  fe: ['amor', 'coragem', 'felicidade', 'sonhos', 'motivacao'],
  sonhos: ['amor', 'motivacao', 'fe', 'felicidade', 'persistencia'],
  aprendizado: ['sabedoria', 'reflexao', 'metafora', 'educacao'],
  historias: ['metafora', 'reflexao', 'sabedoria'],
  'bom-dia': ['otimismo', 'felicidade', 'motivacao', 'inspiracional'],
  terapeutica: ['cura', 'saude', 'reflexao', 'metafora', 'pnl', 'comportamento'],
  cura: ['saude', 'terapeutica', 'reflexao', 'comportamento'],
  saude: ['cura', 'terapeutica', 'educacao'],
  educacao: ['aprendizado', 'sabedoria', 'saude'],
  pnl: ['terapeutica', 'comportamento', 'motivacao', 'reflexao'],
  comportamento: ['terapeutica', 'pnl', 'estrategia', 'sabedoria', 'reflexao'],
};

/** Palavras-chave no texto quando a tag exata é rara no acervo. */
export const THEME_KEYWORDS: Record<string, string[]> = {
  estrategia: [
    'estratégia', 'estrategia', 'planejamento', 'plano', 'planos', 'visão', 'visao',
    'decisão', 'decisao', 'objetivo', 'objetivos', 'liderança', 'lideranca',
    'inteligência', 'inteligencia', 'execução', 'execucao', 'conquista', 'metas', 'meta ',
  ],
  amor: ['amor', 'amar', 'amoroso', 'carinho', 'afeto', 'paixão', 'paixao', 'coração', 'coracao'],
  motivacao: ['motivação', 'motivacao', 'motivar', 'inspirar', 'inspiração', 'inspiracao', 'ânimo', 'animo'],
  reflexao: ['reflexão', 'reflexao', 'refletir', 'pensar', 'contemplar', 'meditar', 'consciência', 'consciencia'],
  sabedoria: ['sabedoria', 'sábio', 'sabio', 'prudência', 'prudencia', 'conhecimento', 'aprender'],
  sucesso: ['sucesso', 'vencer', 'vitória', 'vitoria', 'conquistar', 'realização', 'realizacao'],
  foco: ['foco', 'concentrar', 'concentração', 'concentracao', 'atenção', 'atencao', 'prioridade'],
  coragem: ['coragem', 'corajoso', 'ousadia', 'ousar', 'bravura', 'enfrentar'],
  superacao: ['superação', 'superacao', 'superar', 'vencer', 'obstáculo', 'obstaculo'],
  felicidade: ['felicidade', 'feliz', 'alegria', 'contentamento', 'bem-estar'],
  sonhos: ['sonho', 'sonhos', 'sonhar', 'aspiração', 'aspiracao', 'ideal'],
  persistencia: ['persistência', 'persistencia', 'persistir', 'insistir', 'constância', 'constancia'],
  determinacao: ['determinação', 'determinacao', 'determinado', 'firmeza', 'vontade'],
  comportamento: ['comportamento', 'atitude', 'hábito', 'habito', 'conduta', 'ação', 'acao'],
  cura: ['cura', 'curar', 'sarar', 'cicatrizar', 'sanar', 'recuperação', 'recuperacao'],
  saude: ['saúde', 'saude', 'bem-estar', 'cuidar', 'vitalidade'],
  educacao: ['educação', 'educacao', 'ensinar', 'aprender', 'escola', 'conhecimento'],
};

export type TagMatchKind = 'primary' | 'related' | 'keyword';

export interface RankedTagItem<T extends ItemComTags & { id?: string }> {
  item: T;
  score: number;
  matchKind: TagMatchKind;
}

function clusterMates(slug: string): string[] {
  const mates: string[] = [];
  for (const cluster of SEMANTIC_CLUSTERS) {
    if (cluster.includes(slug)) mates.push(...cluster.filter((s) => s !== slug));
  }
  return mates;
}

/** Tags que coocorrem nos mesmos itens da tag principal. */
export function cooccurrenceRelatedSlugs(
  primarySlug: string,
  banco: ItemComTags[],
  limit = 8
): string[] {
  const counts = new Map<string, number>();
  for (const item of banco) {
    const slugs = (item.tags || []).map(slugFromTag).filter(Boolean);
    if (!slugs.includes(primarySlug)) continue;
    for (const s of slugs) {
      if (s !== primarySlug) counts.set(s, (counts.get(s) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([s]) => s);
}

/** Conjunto final de slugs: principal + relacionadas existentes no registry. */
export function getExpandedTagSlugs(
  primarySlug: string,
  registry: TagRegistryEntry[],
  banco: ItemComTags[]
): { primary: string; related: string[]; all: Set<string> } {
  const existing = new Set(registry.map((r) => r.slug));
  const related = new Set<string>();

  for (const s of RELATED_TAGS_MAP[primarySlug] || []) {
    if (existing.has(s) && s !== primarySlug) related.add(s);
  }
  for (const s of clusterMates(primarySlug)) {
    if (existing.has(s)) related.add(s);
  }
  for (const s of cooccurrenceRelatedSlugs(primarySlug, banco, 8)) {
    if (existing.has(s)) related.add(s);
  }

  const all = new Set<string>([primarySlug, ...related]);
  return { primary: primarySlug, related: [...related], all };
}

function textBlob(item: ItemComTags & { texto?: string; titulo?: string; resumo?: string }): string {
  return [safeText(item.texto), safeText(item.titulo), safeText(item.resumo), ...safeTags(item.tags)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesKeywords(item: ItemComTags, primarySlug: string): boolean {
  const keywords = THEME_KEYWORDS[primarySlug];
  if (!keywords?.length) return false;
  const blob = textBlob(item);
  return keywords.some((kw) => blob.includes(safeLower(kw).normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
}

/**
 * Filtra e ordena o banco: tag exata primeiro, depois relacionadas, depois match por palavra-chave.
 * Remove duplicatas por id.
 */
export function filterAndRankBancoForTagPage<
  T extends ItemComTags & { id?: string },
>(banco: T[], primarySlug: string, registry: TagRegistryEntry[]): RankedTagItem<T>[] {
  const slug = slugFromTag(primarySlug);
  if (!slug) return [];

  const { all, related } = getExpandedTagSlugs(slug, registry, banco);
  const relatedSet = new Set(related);
  const seen = new Set<string>();
  const ranked: RankedTagItem<T>[] = [];

  for (const item of banco) {
    const id = item.id ?? JSON.stringify(item);
    if (seen.has(id)) continue;

    const itemSlugs = safeTags(item.tags).map(slugFromTag).filter(Boolean);
    const hasPrimary = itemSlugs.includes(slug);
    const relatedHits = itemSlugs.filter((s) => relatedSet.has(s)).length;
    const keywordHit = !hasPrimary && relatedHits === 0 && matchesKeywords(item, slug);

    if (!hasPrimary && relatedHits === 0 && !keywordHit) continue;

    seen.add(id);

    let score = 0;
    let matchKind: TagMatchKind = 'keyword';

    if (hasPrimary) {
      score += 1000;
      matchKind = 'primary';
    }
    if (relatedHits > 0) {
      score += 200 + relatedHits * 40;
      if (!hasPrimary) matchKind = 'related';
    }
    if (keywordHit) {
      score += 80;
      matchKind = 'keyword';
    }

    ranked.push({ item, score, matchKind });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/** Tags relacionadas para navegação interna (prioriza mapa semântico). */
export function getSemanticRelatedTags(
  registry: TagRegistryEntry[],
  currentSlug: string,
  limit = 10
): TagRegistryEntry[] {
  const { related } = getExpandedTagSlugs(currentSlug, registry, []);
  const bySlug = new Map(registry.map((r) => [r.slug, r]));
  const ordered: TagRegistryEntry[] = [];

  for (const s of related) {
    const entry = bySlug.get(s);
    if (entry && entry.slug !== currentSlug) ordered.push(entry);
  }

  if (ordered.length < limit) {
    for (const r of registry) {
      if (r.slug === currentSlug || ordered.some((o) => o.slug === r.slug)) continue;
      ordered.push(r);
      if (ordered.length >= limit) break;
    }
  }

  return ordered.slice(0, limit);
}

/** Rótulos legíveis das tags relacionadas para intro/SEO. */
export function relatedTagLabels(registry: TagRegistryEntry[], currentSlug: string, max = 5): string[] {
  return getSemanticRelatedTags(registry, currentSlug, max).map((r) => r.tag);
}
