import type { FraseCanonical } from '../frases/canonical';
import { slugify } from '../utils/slugify';
import { fixCsvEncoding } from '../importers/csvParser';
import { enrichAuthor } from './author';
import {
  classifyCategoriaPrincipal,
  classifyContextos,
  classifyEmocoes,
  detectIdioma,
  extractTemas,
} from './classify';
import { generateExplicacaoUnica, isGenericExplicacao } from './explicacao';
import { buildSeoPack } from './seo';
import type { FraseEnriquecida, FraseIndexLite } from './types';

export function shardForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return (h % 256).toString(16).padStart(2, '0');
}

export function enrichFraseRecord(raw: FraseCanonical): FraseEnriquecida {
  const today = new Date().toISOString().slice(0, 10);
  const texto = fixCsvEncoding(raw.frase_original.trim());
  const autor = fixCsvEncoding(raw.autor_original.trim() || 'Anônimo');
  const autorSlug = slugify(autor);
  const tags = (raw.palavras_chave?.length ? raw.palavras_chave : [raw.categoria, ...raw.contextos]).map(
    (t) => slugify(String(t))
  );

  const categoriaPrincipal = classifyCategoriaPrincipal(texto, tags, raw.categoria);
  const categorias = [
    categoriaPrincipal,
    ...tags.filter((t) => t !== categoriaPrincipal),
  ].slice(0, 5);
  const contextos = [
    ...classifyContextos(texto, tags),
    ...raw.contextos.map((c) => slugify(c)).filter(Boolean),
  ].slice(0, 5);
  const emocoes = classifyEmocoes(texto, tags);
  const temas = extractTemas(texto, categoriaPrincipal, tags);
  const palavrasChave = [...new Set([...tags, categoriaPrincipal, ...contextos, ...emocoes])].slice(0, 10);
  const tagsSeo = [...new Set([...categorias, ...contextos, ...emocoes, autorSlug])];

  const authorMeta = enrichAuthor(autor, {
    tipoAutor: raw.autor_tipo,
    nacionalidadeAutor: raw.nacionalidade,
    periodoHistorico: raw.nascimento_falecimento,
  });

  let explicacao = raw.explicacao?.trim() || '';
  if (isGenericExplicacao(explicacao)) {
    explicacao = generateExplicacaoUnica({
      frase: texto,
      autor,
      categoriaPrincipal,
      contextos: contextos.length ? contextos : [categoriaPrincipal],
      temas,
    });
  }

  const ano = raw.ano_ou_data?.trim() || authorMeta.nascimentoAutor || null;

  const semantica = {
    categoriaPrincipal,
    categorias,
    contextos: [...new Set(contextos)],
    emocoes,
    temas,
    palavrasChave,
    tagsSeo,
    idiomaOriginal: detectIdioma(texto),
    languageOriginal: detectIdioma(texto),
    ano,
    periodoHistorico: authorMeta.periodoHistorico,
    nacionalidadeAutor: authorMeta.nacionalidadeAutor,
    nascimentoAutor: authorMeta.nascimentoAutor,
    falecimentoAutor: authorMeta.falecimentoAutor,
    tipoAutor: authorMeta.tipoAutor,
    popularidade: Math.min(100, 20 + Math.floor(texto.length / 10) + tags.length * 2),
    fonte: raw.fontes || raw.informacoes?.origem_import || null,
    ultimaAtualizacao: today,
    frasesRelacionadas: [...temas, ...categorias.slice(0, 2)].slice(0, 6),
    biografiaAutorCurta: authorMeta.biografiaAutorCurta,
  };

  const seo = buildSeoPack({
    frase: texto,
    slug: raw.slug,
    autor,
    autorSlug,
    categoriaPrincipal,
    categorias,
    contextos: semantica.contextos,
    emocoes,
    palavrasChave,
    explicacao,
  });

  return {
    id: raw.id,
    slug: raw.slug,
    texto,
    autor,
    autorSlug,
    explicacao,
    semantica,
    seo,
    frase_original: texto,
    autor_original: autor,
    autor_slug: autorSlug,
    categoria: categoriaPrincipal,
    contextos: semantica.contextos,
    palavras_chave: palavrasChave,
    ano_ou_data: ano,
    autor_tipo: authorMeta.tipoAutor,
    nacionalidade: authorMeta.nacionalidadeAutor,
    nascimento_falecimento: authorMeta.periodoHistorico,
    fontes: raw.fontes ?? null,
    informacoes: {
      ultima_atualizacao: today,
      confiabilidade: raw.informacoes?.confiabilidade ?? 'heuristica-local',
      curadoria_ia: false,
      enriquecimento_fase2: true,
    },
  };
}

export function toIndexLite(f: FraseEnriquecida): FraseIndexLite {
  return {
    id: f.id,
    slug: f.slug,
    autorSlug: f.autorSlug,
    categoriaPrincipal: f.semantica.categoriaPrincipal,
    shard: shardForSlug(f.slug),
  };
}
