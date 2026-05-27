import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  slugFromTitulo,
} from './seo';

/** Prefixo de URL amigável: /mensagens-de-motivacao */
export const TAG_URL_PREFIX = 'mensagens-de';

export function slugFromTag(tag: string): string {
  return slugFromTitulo(tag);
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
    for (const raw of item.tags || []) {
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
      const canonical = [...data.variants.entries()].sort((a, b) => b[1] - a[1])[0][0];
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
  const normalized = slugFromTitulo(slug);
  return registry.find((r) => r.slug === normalized);
}

export function itemMatchesTag(item: ItemComTags, entry: TagRegistryEntry): boolean {
  return (item.tags || []).some((t) => slugFromTag(t) === entry.slug);
}

export function tagPageTitle(tag: string): string {
  return `Mensagens de ${tag}`;
}

export function tagSeoTitle(tag: string): string {
  return tagPageTitle(tag);
}

export function tagMetaDescription(tag: string, itemCount: number): string {
  const tema = tag.toLowerCase();
  const qtd =
    itemCount > 0
      ? ` Explore ${itemCount} frases e metáforas sobre ${tema}.`
      : '';
  return `Veja mensagens de ${tema}, frases inspiradoras e reflexões para compartilhar, se motivar e encontrar novas perspectivas.${qtd} ${SITE_NAME}.`;
}

/** 2–5 parágrafos introdutórios gerados de forma natural (sem keyword stuffing). */
export function tagIntroParagraphs(tag: string, itemCount: number): string[] {
  const tema = tag.toLowerCase();
  const p1 = `Bem-vindo à coleção de mensagens de ${tema} no ${SITE_NAME}. Aqui você encontra frases curtas e metáforas terapêuticas pensadas para provocar reflexão, inspirar atitudes positivas e facilitar o compartilhamento no dia a dia.`;
  const p2 = `Cada conteúdo desta página foi organizado em torno do tema «${tag}», reunindo perspectivas variadas sobre o assunto. Use as mensagens como lembrete pessoal, legenda para redes sociais ou ponto de partida para uma conversa mais profunda consigo mesmo ou com outras pessoas.`;
  const p3 =
    itemCount > 0
      ? `No momento, você tem acesso a ${itemCount} textos catalogados nesta categoria — um acervo em constante crescimento, alimentado pelo nosso banco de frases e metáforas.`
      : `Esta categoria faz parte do nosso acervo em expansão de frases e metáforas; novos conteúdos são adicionados regularmente.`;
  const p4 = `Refletir sobre ${tema} não precisa ser complicado: basta uma frase certa no momento certo para mudar o tom do seu dia. Salve as que mais ressoam, copie para compartilhar ou explore temas relacionados logo abaixo.`;
  const p5 = `O ${SITE_NAME} acredita que palavras bem escolhidas podem ser ferramentas de mudança. Navegue com calma, descubra novas vozes e autorias, e volte sempre que precisar de uma dose de clareza emocional.`;

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
