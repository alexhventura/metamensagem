import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  slugFromTitulo,
} from './seo';
import { safeLower, safeText, safeTags } from './safeContent';

/** Prefixo de URL amigável: /mensagens-de-motivacao */
export const TAG_URL_PREFIX = 'mensagens-de';

/** Normaliza texto/tag/slug para comparação (minúsculas, sem acentos, hífens). */
export function normalizeTagKey(str: unknown): string {
  return safeText(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function slugFromTag(tag: unknown): string {
  return normalizeTagKey(tag);
}

export function pathFromTag(tag: string): string {
  return `/${TAG_URL_PREFIX}-${slugFromTag(tag)}`;
}

export function urlFromTag(tag: string): string {
  return `${SITE_ORIGIN}${pathFromTag(tag)}`;
}

export interface TagRegistryEntry {
  /** Nome canônico exibido (variante mais frequente no banco). */
  tag: string;
  slug: string;
  aliases: string[];
  /** Quantidade de itens (frases + metáforas) com esta tag. */
  count: number;
}

export interface ItemComTags {
  tags?: string[];
}

/** Agrupa variantes da mesma tag (ex.: Reflexão / Reflexao) por slug normalizado. */
export function buildTagRegistry(items: ItemComTags[]): TagRegistryEntry[] {
  const bySlug = new Map<string, { variants: Map<string, number>; count: number }>();

  for (const item of items) {
    if (!item) continue;
    for (const raw of safeTags(item.tags)) {
      const slug = slugFromTag(raw);
      if (!slug) continue;
      if (!bySlug.has(slug)) {
        bySlug.set(slug, { variants: new Map(), count: 0 });
      }
      const bucket = bySlug.get(slug)!;
      bucket.count += 1;
      bucket.variants.set(raw, (bucket.variants.get(raw) || 0) + 1);
    }
  }

  return [...bySlug.entries()]
    .map(([slug, data]) => {
      const top = [...data.variants.entries()].sort((a, b) => b[1] - a[1])[0];
      const canonical = safeText(top?.[0]) || slug;
      return {
        tag: canonical,
        slug,
        aliases: [...data.variants.keys()].filter((t) => t !== canonical),
        count: data.count,
      };
    })
    .sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
}

export function findTagBySlug(
  registry: TagRegistryEntry[],
  slug: string
): TagRegistryEntry | undefined {
  const normalized = slugFromTag(slug);
  if (!normalized) return undefined;
  return registry.find((r) => r.slug === normalized);
}

/**
 * Extrai o slug da tag a partir do segmento de URL (ex.: "mensagens-de-motivacao" → "motivacao").
 * Suporta prefixo oficial e variantes como "mensagens-motivacionais".
 */
/** URLs amigáveis alternativas → slug canônico da tag. */
export const TAG_PATH_ALIASES: Record<string, string> = {
  'frases-motivacionais': 'motivacao',
  'frases-motivacao': 'motivacao',
  'metaforas-da-vida': 'metafora',
  'reflexoes-profundas': 'reflexao',
  'reflexoes-da-vida': 'reflexao',
  'frases-para-status': 'inspiracional',
  'mensagens-de-superacao': 'superacao',
  'mensagens-motivacionais': 'motivacao',
};

export function extractSlugFromTagUrlSegment(segment: string | undefined): string | null {
  if (!segment) return null;
  const lower = safeLower(segment);

  if (TAG_PATH_ALIASES[lower]) return TAG_PATH_ALIASES[lower];

  const officialPrefix = `${TAG_URL_PREFIX}-`;
  if (lower.startsWith(officialPrefix)) {
    return slugFromTag(segment.slice(officialPrefix.length));
  }

  if (lower.startsWith('mensagens-')) {
    return slugFromTag(segment.slice('mensagens-'.length));
  }

  if (lower.startsWith('frases-')) {
    return slugFromTag(segment.slice('frases-'.length));
  }

  if (lower.startsWith('metaforas-')) {
    return slugFromTag(segment.slice('metaforas-'.length));
  }

  if (lower.startsWith('reflexoes-')) {
    return slugFromTag(segment.slice('reflexoes-'.length));
  }

  return slugFromTag(segment) || null;
}

export function isTagCategoryPath(segment: string | undefined): boolean {
  if (!segment) return false;
  const lower = safeLower(segment);
  if (TAG_PATH_ALIASES[lower]) return true;
  return (
    lower.startsWith(`${TAG_URL_PREFIX}-`) ||
    lower.startsWith('mensagens-') ||
    lower.startsWith('frases-') ||
    lower.startsWith('metaforas-') ||
    lower.startsWith('reflexoes-')
  );
}

export function itemMatchesTag(item: ItemComTags, entry: TagRegistryEntry): boolean {
  return itemMatchesTagSlug(item, entry.slug);
}

/** Mesmo critério da home (Fuse em tags), comparando por slug normalizado. */
export function itemMatchesTagSlug(item: ItemComTags, tagSlug: string): boolean {
  const normalized = slugFromTag(tagSlug);
  if (!normalized) return false;
  return (item.tags || []).some((t) => slugFromTag(t) === normalized);
}

/** Filtra o banco global (frases + metáforas) pela tag, igual à busca por tag na home. */
export function filterBancoByTagSlug<T extends ItemComTags>(
  banco: T[],
  tagSlug: string
): T[] {
  return banco.filter((item) => itemMatchesTagSlug(item, tagSlug));
}

/** Entrada do registry ou sintética a partir do slug (evita página vazia se registry atrasar). */
export function resolveTagEntry(
  registry: TagRegistryEntry[],
  tagSlug: string,
  itemCount: number
): TagRegistryEntry | undefined {
  const normalized = slugFromTag(tagSlug);
  if (!normalized) return undefined;

  const found = registry.find((r) => r.slug === normalized);
  if (found) return { ...found, count: itemCount || found.count };

  const label = normalized
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    tag: label,
    slug: normalized,
    aliases: [],
    count: itemCount,
  };
}

export function tagPageTitle(tag: string): string {
  return `Mensagens de ${tag}`;
}

export function tagSeoTitle(tag: string): string {
  return tagPageTitle(tag);
}

export function tagMetaDescription(
  tag: string,
  itemCount: number,
  relatedLabels: string[] = []
): string {
  const tema = safeLower(tag);
  const qtd =
    itemCount > 0
      ? ` Mais de ${itemCount} frases e metáforas sobre ${tema}`
      : ` Frases e metáforas sobre ${tema}`;
  const extras =
    relatedLabels.length > 0
      ? `, incluindo reflexões sobre ${relatedLabels
          .slice(0, 4)
          .map((l) => safeLower(l))
          .join(', ')}`
      : '';
  return `Veja mensagens de ${tema}${qtd}${extras}. Inspire-se, compartilhe e encontre novas perspectivas no ${SITE_NAME}.`;
}

const THEME_INTRO: Record<string, string> = {
  estrategia:
    'Mensagens sobre estratégia ajudam a refletir sobre decisões conscientes, planejamento de vida e visão de futuro — escolhas que constroem resultados com paciência e clareza.',
  amor:
    'Frases de amor traduzem afeto, cuidado e conexão humana em palavras que acolhem o coração e convidam ao compartilhamento sincero.',
  motivacao:
    'A motivação nasce de pequenos lembretes diários: frases que reacendem o ânimo, fortalecem a persistência e lembram por que vale continuar.',
  reflexao:
    'Textos de reflexão convidam a pausar, observar a própria história e encontrar sentido nas experiências que moldam quem somos.',
  metafora:
    'Metáforas terapêuticas traduzem emoções complexas em narrativas acessíveis — histórias que curam, ensinam e transformam perspectivas.',
  sabedoria:
    'A sabedoria aparece quando experiência e humildade se encontram; estas mensagens reúnem insights para viver com mais consciência.',
  sucesso:
    'Sobre sucesso, o essencial não é apenas vencer, mas cultivar disciplina, propósito e gratidão em cada passo da jornada.',
  foco:
    'Mensagens de foco lembram que energia e atenção são recursos preciosos — direcioná-los bem é um ato de amor-próprio e estratégia.',
  coragem:
    'A coragem não elimina o medo: ela nos ensina a agir apesar dele, com dignidade e esperança renovada.',
  superacao:
    'Superação é transformar dor em aprendizado; estas frases honram quem segue em frente mesmo quando o caminho parece íngreme.',
};

/** Parágrafos introdutórios contextualizados (SEO natural, sem stuffing). */
export function tagIntroParagraphs(
  tag: string,
  itemCount: number,
  stats?: { primary: number; related: number; keyword: number },
  relatedLabels: string[] = []
): string[] {
  const tema = safeLower(tag);
  const slug = slugFromTag(tag);
  const thematic =
    THEME_INTRO[slug] ||
    `Esta coleção reúne mensagens sobre ${tema} para inspirar atitudes positivas, fortalecer emoções e apoiar momentos de mudança pessoal.`;

  const p1 = `Bem-vindo às mensagens de ${tema} no ${SITE_NAME}. ${thematic}`;

  const relatedText =
    relatedLabels.length > 0
      ? ` Para ampliar sua leitura, incluímos também conteúdos de temas próximos, como ${relatedLabels.slice(0, 5).join(', ')}.`
      : '';

  const p2 = `Organizamos frases curtas e metáforas terapêuticas que dialogam com «${tag}» e com ideias semanticamente relacionadas — porque sentimentos e valores raramente aparecem isolados na vida real.${relatedText}`;

  const detalhe =
    stats && itemCount > 0
      ? ` Você encontra ${itemCount} mensagens nesta página${stats.primary > 0 ? ` (${stats.primary} com a tag principal` : ''}${stats.related > 0 ? `${stats.primary > 0 ? ', ' : ' ('}${stats.related} de temas relacionados` : ''}${stats.keyword > 0 ? `${stats.primary > 0 || stats.related > 0 ? ', ' : ' ('}${stats.keyword} por proximidade de significado` : ''}${stats.primary > 0 || stats.related > 0 || stats.keyword > 0 ? ')' : ''}.`
      : itemCount > 0
        ? ` São ${itemCount} textos disponíveis para ler, copiar e compartilhar.`
        : '';

  const p3 = `Nosso acervo cresce continuamente com novas frases e histórias.${detalhe} Use a busca acima para refinar o que deseja encontrar.`;

  const p4 = `Mensagens sobre ${tema} servem para status, conversas difíceis, terapia informal ou simples lembretes no dia a dia. Escolha as que ressoam, salve-as e volte quando precisar de clareza emocional.`;

  const p5 = `Explore os temas relacionados abaixo para fortalecer sua jornada de autoconhecimento. O ${SITE_NAME} existe para que palavras bem escolhidas se tornem ferramentas reais de mudança.`;

  return [p1, p2, p3, p4, p5];
}

export function getRelatedTags(
  registry: TagRegistryEntry[],
  current: TagRegistryEntry,
  limit = 8
): TagRegistryEntry[] {
  return registry
    .filter((r) => r.slug !== current.slug)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function tagPageJsonLd(entry: TagRegistryEntry, itemCount: number) {
  const pageUrl = urlFromTag(entry.tag);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: tagPageTitle(entry.tag),
    description: tagMetaDescription(entry.tag, itemCount),
    url: pageUrl,
    inLanguage: 'pt-BR',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    numberOfItems: itemCount,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  };
}

export function tagNotFoundDescription(): string {
  return DEFAULT_DESCRIPTION;
}
