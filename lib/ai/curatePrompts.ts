import type { FraseCanonical } from '../frases/canonical';

export interface AiCurationRow {
  id: string;
  explicacao?: string;
  categoria?: string;
  contextos?: string[];
  palavras_chave?: string[];
  autor_tipo?: string | null;
  nacionalidade?: string | null;
  nascimento_falecimento?: string | null;
  ano_ou_data?: string | null;
  observacao?: string | null;
  confiabilidade?: string | null;
}

export function buildCuratePrompt(batch: FraseCanonical[]): string {
  const items = batch.map((b) => ({
    id: b.id,
    frase: b.frase_original,
    autor: b.autor_original,
    fonte: b.fontes,
  }));

  return `Você é curador editorial do Metamensagem (site brasileiro de frases).

Para cada citação, retorne metadados em português do Brasil. REGRAS:
- NÃO traduza nem altere a frase (ela fica fora deste JSON).
- "explicacao": 2-4 frases educativas (máx. 420 caracteres) sobre contexto e sentido; sem inventar obra/data específica sem base.
- "categoria" e "contextos" / "palavras_chave": slugs minúsculos sem acento (motivacao, filosofia, ciencia, etc.).
- "autor_tipo", "nacionalidade", "nascimento_falecimento": só para figuras públicas conhecidas; senão null.
- "ano_ou_data": só se houver base razoável; senão null.
- "observacao": nota breve se atribuição for incerta; senão null.
- "confiabilidade": "alta" | "media" | "baixa".

Responda APENAS com um JSON array: [{ id, explicacao, categoria, contextos, palavras_chave, autor_tipo, nacionalidade, nascimento_falecimento, ano_ou_data, observacao, confiabilidade }, ...]

Itens:
${JSON.stringify(items, null, 2)}`;
}

export interface ExplicacaoRow {
  id: string;
  explicacao: string;
}

export function buildExplicacaoPrompt(
  batch: {
    id: string;
    frase_original: string;
    autor_original: string;
    categoria?: string;
    contextos?: string[];
    autor_tipo?: string | null;
    nacionalidade?: string | null;
    nascimento_falecimento?: string | null;
    ano_ou_data?: string | null;
  }[]
): string {
  const items = batch.map((f, i) => ({
    n: i + 1,
    id: f.id,
    frase: f.frase_original,
    autor: f.autor_original,
    categoria: f.categoria,
    contextos: f.contextos,
    autor_tipo: f.autor_tipo,
    nacionalidade: f.nacionalidade,
    periodo: f.nascimento_falecimento,
    ano_ou_data: f.ano_ou_data,
  }));

  return `Você é um especialista em história das ideias e contexto cultural em português do Brasil.

Para cada frase abaixo, escreva uma "explicacao" curta (2 a 4 frases, máximo 420 caracteres) que:
- situe o provável contexto em que a fala/citação faz sentido (obra, época, tema público ou íntimo);
- explique por que alguém diria isso naquele momento ou em que situação o leitor usaria a frase;
- use os metadados fornecidos quando ajudarem, sem inventar datas, obras ou eventos específicos não indicados;
- se a atribuição ao autor for incerta ou a frase for popular/anônima, diga isso com naturalidade;
- tom informativo e acessível, sem tom de marketing;
- responda APENAS com um JSON array: [{ "id": "...", "explicacao": "..." }, ...] na mesma ordem dos itens.

Itens:
${JSON.stringify(items, null, 2)}`;
}
