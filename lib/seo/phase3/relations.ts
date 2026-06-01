const MIN_REL = 10;
const MAX_REL = 30;

function pickRelated(slugs: string[], self: string, limit: number): string[] {
  const out: string[] = [];
  for (const s of slugs) {
    if (s === self) continue;
    if (!out.includes(s)) out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

export function buildRelationsForSlug(
  slug: string,
  ctx: {
    clusterSlug: string;
    autorSlug: string;
    categoria: string;
    contextos: string[];
    temas: string[];
    keywords: string[];
    byCluster: Map<string, string[]>;
    byAutor: Map<string, string[]>;
    byCategoria: Map<string, string[]>;
    byContexto: Map<string, string[]>;
    byTema: Map<string, string[]>;
    byKeyword: Map<string, string[]>;
    slugToAutor: Map<string, string>;
  }
) {
  const relatedQuotes = new Set<string>();
  for (const s of pickRelated(ctx.byCluster.get(ctx.clusterSlug) || [], slug, 15)) relatedQuotes.add(s);
  if (ctx.autorSlug) {
    for (const s of pickRelated(ctx.byAutor.get(ctx.autorSlug) || [], slug, 10)) relatedQuotes.add(s);
  }
  for (const s of pickRelated(ctx.byCategoria.get(ctx.categoria) || [], slug, 10)) relatedQuotes.add(s);
  for (const c of ctx.contextos) {
    for (const s of pickRelated(ctx.byContexto.get(c) || [], slug, 5)) relatedQuotes.add(s);
  }

  let relatedQuotesArr = [...relatedQuotes].slice(0, MAX_REL);
  if (relatedQuotesArr.length < MIN_REL) {
    for (const t of ctx.temas) {
      for (const s of pickRelated(ctx.byTema.get(t) || [], slug, 5)) {
        relatedQuotesArr.push(s);
        if (relatedQuotesArr.length >= MIN_REL) break;
      }
      if (relatedQuotesArr.length >= MIN_REL) break;
    }
  }
  relatedQuotesArr = [...new Set(relatedQuotesArr)].slice(0, MAX_REL);

  const clusterPeers = ctx.byCluster.get(ctx.clusterSlug) || [];
  const authorCounts = new Map<string, number>();
  for (const peerSlug of clusterPeers.slice(0, 300)) {
    const a = ctx.slugToAutor.get(peerSlug);
    if (!a || a === ctx.autorSlug) continue;
    authorCounts.set(a, (authorCounts.get(a) || 0) + 1);
  }
  const relatedAuthors = [...authorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([a]) => a);

  const relatedCategories = pickRelated(
    [...ctx.byCategoria.keys()].filter((c) => c !== ctx.categoria),
    ctx.categoria,
    12
  );
  const relatedContexts = ctx.contextos.flatMap((c) =>
    pickRelated([...ctx.byContexto.keys()].filter((k) => k !== c), c, 3)
  ).slice(0, 12);
  const relatedThemes = ctx.temas.flatMap((t) =>
    pickRelated([...ctx.byTema.keys()].filter((k) => k !== t), t, 3)
  ).slice(0, 12);
  const relatedKeywords = ctx.keywords.flatMap((k) =>
    pickRelated([...ctx.byKeyword.keys()].filter((x) => x !== k), k, 3)
  ).slice(0, 15);

  return {
    relatedQuotes: relatedQuotesArr,
    relatedAuthors: [...new Set(relatedAuthors)].slice(0, 20),
    relatedCategories: [...new Set(relatedCategories)].slice(0, 15),
    relatedContexts: [...new Set(relatedContexts)].slice(0, 15),
    relatedThemes: [...new Set(relatedThemes)].slice(0, 15),
    relatedKeywords: [...new Set(relatedKeywords)].slice(0, 20),
    clusterSlug: ctx.clusterSlug,
  };
}
