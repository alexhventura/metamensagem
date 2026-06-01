import { loadAuthorFacts } from '../transformers/fraseTransformer';

export interface AuthorEnrichment {
  nacionalidadeAutor: string | null;
  nascimentoAutor: string | null;
  falecimentoAutor: string | null;
  tipoAutor: string | null;
  periodoHistorico: string | null;
  biografiaAutorCurta: string | null;
}

const BIO_TEMPLATES: Record<string, string> = {
  fisico: 'Cientista e físico teórico, referência na física moderna.',
  filosof: 'Filósofo e pensador, com obras sobre ética, política e metafísica.',
  escritor: 'Escritor com obras literárias de ampla circulação.',
  poeta: 'Poeta com produção marcante na língua e na cultura.',
  'lider politico': 'Líder político e figura pública de seu tempo.',
  politico: 'Figura política com atuação em governo e debates públicos.',
  empresario: 'Empresário e inovador no setor privado.',
  musico: 'Músico e compositor com influência cultural.',
  ator: 'Ator e personalidade das artes cênicas ou audiovisual.',
  dramaturgo: 'Dramaturgo e autor teatral de grande repercussão.',
};

function norm(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

let factsCache: ReturnType<typeof loadAuthorFacts> | null = null;

function getFacts() {
  if (!factsCache) factsCache = loadAuthorFacts();
  return factsCache;
}

function parsePeriodo(nascimento_falecimento: string | null): {
  nascimento: string | null;
  falecimento: string | null;
  periodo: string | null;
} {
  if (!nascimento_falecimento) return { nascimento: null, falecimento: null, periodo: null };
  const m = nascimento_falecimento.match(/(\d{3,4})\s*[-–]\s*(\d{3,4}|)/);
  if (!m) return { nascimento: null, falecimento: null, periodo: nascimento_falecimento };
  return {
    nascimento: m[1],
    falecimento: m[2] || null,
    periodo: nascimento_falecimento,
  };
}

export function enrichAuthor(autor: string, existing?: Partial<AuthorEnrichment>): AuthorEnrichment {
  const facts = getFacts()[norm(autor)];
  const tipo = existing?.tipoAutor || facts?.autor_tipo || null;
  const nacionalidade = existing?.nacionalidadeAutor || facts?.nacionalidade || null;
  const periodoRaw = facts?.nascimento_falecimento || existing?.periodoHistorico || null;
  const { nascimento, falecimento, periodo } = parsePeriodo(periodoRaw);

  let biografia: string | null = existing?.biografiaAutorCurta || null;
  if (!biografia && tipo) {
    const key = tipo.replace(/[^a-z\s]/gi, '').trim();
    for (const [k, v] of Object.entries(BIO_TEMPLATES)) {
      if (key.includes(k.replace(/\s/g, '')) || key.includes(k)) {
        biografia = `${autor}. ${v}`;
        break;
      }
    }
  }
  if (!biografia && nacionalidade) {
    biografia = `${autor}, personalidade de origem ${nacionalidade.replace(/-/g, ' ')} citada no acervo Metamensagem.`;
  }

  return {
    nacionalidadeAutor: nacionalidade,
    nascimentoAutor: nascimento,
    falecimentoAutor: falecimento,
    tipoAutor: tipo,
    periodoHistorico: periodo,
    biografiaAutorCurta: biografia,
  };
}
