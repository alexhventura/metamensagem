/** Explicações únicas por heurística (sem IA paga). */

const GENERIC_PATTERNS = [
  /integrada ao acervo Metamensagem/i,
  /Convida à reflexão sobre/i,
  /no espírito da/i,
];

export function isGenericExplicacao(text: string): boolean {
  if (!text?.trim()) return true;
  return GENERIC_PATTERNS.some((p) => p.test(text));
}

function pickLesson(frase: string, categoria: string): string {
  const l = frase.toLowerCase();
  if (/não|never|don't|cannot|impossible/.test(l)) return 'limites e escolhas conscientes';
  if (/amor|love|heart/.test(l)) return 'vínculos afetivos e cuidado mútuo';
  if (/tempo|time|moment/.test(l)) return 'passagem do tempo e prioridades';
  if (/sucesso|success|win/.test(l)) return 'esforço, persistência e resultados';
  if (/medo|fear|coragem|courage/.test(l)) return 'enfrentar incertezas com ação';
  if (/vida|life|live/.test(l)) return 'sentido da existência e experiência vivida';
  return `temas ligados a ${categoria.replace(/-/g, ' ')}`;
}

export function generateExplicacaoUnica(input: {
  frase: string;
  autor: string;
  categoriaPrincipal: string;
  contextos: string[];
  temas: string[];
}): string {
  const { frase, autor, categoriaPrincipal, contextos, temas } = input;
  const trecho = frase.length > 100 ? `${frase.slice(0, 97)}…` : frase;
  const ctx = contextos.slice(0, 2).join(' e ') || categoriaPrincipal.replace(/-/g, ' ');
  const temaStr = temas.slice(0, 3).join(', ') || ctx;
  const lesson = pickLesson(frase, categoriaPrincipal);
  const lower = frase.toLowerCase();

  if (/\b(como|like|as if|é como)\b/.test(lower) && frase.length > 40) {
    return `Metáfora atribuída a ${autor}: compara elementos do cotidiano para falar de ${lesson}. O trecho “${trecho}” usa imagem concreta para lembrar que ${temaStr} pedem movimento e interpretação pessoal, em tom de ${ctx}.`;
  }

  if (frase.includes('?')) {
    return `Pergunta retórica de ${autor} que provoca ${lesson}. Ao questionar “${trecho}”, o texto convida o leitor a revisar crenças sobre ${temaStr}, com foco em ${ctx}.`;
  }

  if (/must|deve|should|precisa|have to/.test(lower)) {
    return `Orientação direta de ${autor} sobre ${lesson}. A afirmação “${trecho}” funciona como lembrete prático ligado a ${temaStr}, útil em momentos de ${ctx}.`;
  }

  return `Citação de ${autor} sobre ${lesson}. “${trecho}” articula ${temaStr} em registro de ${categoriaPrincipal.replace(/-/g, ' ')}, com relevância para contextos como ${ctx}.`;
}
