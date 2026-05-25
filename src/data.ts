export interface Item {
  id: string;
  tipo: 'frase' | 'metafora';
  texto: string;
  autor: string;
  tags: string[];
  titulo?: string; // Apenas para metáforas
  resumo?: string; // Apenas para metáforas
}

export const ITEMS_DATA: Item[] = [
  {
    id: "f-1",
    tipo: "frase",
    texto: "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
    autor: "Robert Collier",
    tags: ["Motivação", "Sucesso", "Consistência"]
  },
  {
    id: "m-1",
    tipo: "metafora",
    titulo: "A Metáfora do Bambu Chinês",
    autor: "Anônimo",
    resumo: "Paciência, persistência e as forças invisíveis que atuam no silêncio da preparação, antes da grande mudança.",
    texto: "Depois de plantada a semente do bambu chinês, não se vê nada por aproximadamente cinco anos, exceto um minúsculo broto saindo da terra. Todo o seu crescimento é subterrâneo; uma complexa e gigantesca estrutura de raízes se estende vertical e horizontalmente pela terra profunda durante esses anos.\n\nEntão, no final do quinto ano, o bambu chinês cresce rapidamente até atingir mais de vinte e cinco metros de altura.\n\nMuitas coisas em nossa jornada são exatamente assim. Você trabalha, estuda, se esforça, e parece que nada está acontecendo. Mas lembre-se: você não está estagnado, você está criando raízes profundas e indestrutíveis para sustentar a magnitude do seu progresso futuro. Tenha paciência com o seu processo de cultivo.",
    tags: ["Paciência", "Foco", "Consistência", "Crescimento"]
  },
  {
    id: "f-2",
    tipo: "frase",
    texto: "Não vemos as coisas como elas são, mas como nós somos.",
    autor: "Anaïs Nin",
    tags: ["Mente", "Perspectiva", "Sabedoria"]
  },
  {
    id: "m-2",
    tipo: "metafora",
    titulo: "A Metáfora dos Dois Lobos",
    autor: "Tradição Cherokee",
    resumo: "Toda mente humana abriga um combate diário e silencioso. Qual dos lobos internos sairá vitorioso desta batalha?",
    texto: "Um velho guerreiro Cherokee deitou-se ao redor da fogueira com seu neto e lhe disse:\n\n'Uma luta está acontecendo dentro de mim. É uma luta terrível entre dois lobos.\n\nUm lobo representa a raiva, a inveja, o ciúme, a ganância, a prepotência, o medo, a autocomiseração e o egoísmo.\nO outro lobo representa a paz, o amor, a empatia, a esperança, a generosidade, a compaixão, a humildade, a fé e a verdade.'\n\nO neto pensou por alguns instantes sobre as palavras de seu avô, olhou para o fogo e perguntou:\n'Qual lobo sairá vencedor?'\n\nO velho índio Cherokee simplesmente sorriu de volta e respondeu:\n\n'Aquele que você alimentar.'",
    tags: ["Mente", "Sabedoria", "Autoconhecimento", "Foco"]
  },
  {
    id: "f-3",
    tipo: "frase",
    texto: "Aquele que tem um 'porquê' para viver pode suportar quase qualquer 'como'.",
    autor: "Viktor Frankl",
    tags: ["Propósito", "Resiliência", "Filosofia"]
  },
  {
    id: "m-3",
    tipo: "metafora",
    titulo: "A Metáfora do Carvalho e do Junco",
    autor: "Esopo",
    resumo: "No auge da tormenta, a rigidez inabalável de um gigante sucumbe, enquanto a humilde flexibilidade sobrevive intacta.",
    texto: "Um carvalho de proporções monumentais erguia-se soberbo à beira de um rio calmo. Ele ostentava com orgulho seu tronco largo, galhos robustos e sua imponente estatura, sentindo-se incólume e poderoso perante a natureza. Logo abaixo de seus pés, juncos finos cresciam na água úmida.\n\nSempre que soprava um vento leve, os juncos curvavam-se com graça respeitosa, o que fazia o grande carvalho rir com condescendência.\n\nUm dia, uma terrível tempestade de ventos brutais varreu a terra. O imponente carvalho manteve-se rígido, enfrentando as rajadas de frente de forma obstinada. Os frágeis juncos, por sua vez, curvaram-se até o chão, dançando rente ao leito do rio.\n\nO carvalho orgulhoso, recusando-se a vergar, acabou quebrando as próprias raízes sob a fúria inflexível da tempestade e caiu derrotado. Mas quando a tormenta finalmente passou, os juncos ergueram-se novamente de forma orgânica, intactos e revigorados.\n\nA força bruta decai se for rígida; a adaptabilidade e a paciência são os maiores escudos contra as intempéries inevitáveis da existência.",
    tags: ["Resiliência", "Sabedoria", "Adaptabilidade"]
  },
  {
    id: "f-4",
    tipo: "frase",
    texto: "A vida é 10% o que acontece com você e 90% como você reage a isso.",
    autor: "Charles R. Swindoll",
    tags: ["Resiliência", "Atitude", "Perspectiva"]
  },
  {
    id: "m-4",
    tipo: "metafora",
    titulo: "Nan-in e a Xícara de Chá Cheia",
    autor: "Conto Zen",
    resumo: "Um ilustre acadêmico tenta aprender sabedoria com um mestre zen, mas esquece-se de que mentes cheias não têm espaço para transbordar.",
    texto: "Nan-in, um renomado mestre zen japonês da era Meiji, recebeu um dia a visita de um orgulhoso professor universitário que vinha indagar-lhe sobre os ensinamentos profundos do Zen.\n\nAssim que chegou, o professor começou a falar demoradamente, expondo suas próprias opiniões, teses acadêmicas e conclusões intelectuais, mal dando oportunidade para o mestre se pronunciar. O mestre escutava-o em absoluto e paciente silêncio.\n\nApós algum tempo, Nan-in preparou uma bebida de chá fresca e começou a servir o visitante. Ele despejou o líquido na xícara até que estivesse totalmente cheia... mas não parou de servir.\n\nO professor observava o líquido transbordando e escorrendo pela mesa de madeira fina até que não suportou mais e exclamou:\n'Pare! A xícara já está completamente cheia. Não cabe mais nem uma só gota!'\n\nNan-in pousou a chaleira com tranquilidade e disse:\n'Como esta xícara de chá, o senhor está cheio de suas próprias certezas, ideias preconcebidas e opiniões acadêmicas. Como poderei lhe ensinar os caminhos do Zen se o senhor primeiro não esvaziar a sua própria xícara?'",
    tags: ["Sabedoria", "Mente", "Aprendizado", "Humildade"]
  },
  {
    id: "f-5",
    tipo: "frase",
    texto: "A mente que se abre a uma nova ideia jamais voltará ao seu tamanho original.",
    autor: "Albert Einstein",
    tags: ["Sabedoria", "Mente", "Crescimento"]
  },
  {
    id: "m-5",
    tipo: "metafora",
    titulo: "A Borboleta e o Casulo Necessário",
    autor: "Parábola do Crescimento",
    resumo: "Uma lição vital sobre como as lutas e o esforço individual são determinantes para construir nossas verdadeiras asas de liberdade.",
    texto: "Certo dia, um homem percebeu uma pequena abertura em um casulo de borboleta preso a uma planta em seu jardim. Fascinado, ele sentou-se e observou o pequeno inseto por várias horas enquanto este lutava com extrema dificuldade para forçar seu corpo através daquela fresta mínima.\n\nA borboleta parecia ter esgotado suas forças e parado de progredir, como se estivesse presa sem saída. Compadecido com o sofrimento e querendo acelerar o processo, o homem pegou uma tesoura e cortou delicadamente o casulo restante, facilitando a saída do inseto.\n\nA borboleta saiu facilmente. No entanto, o homem observou que seu corpo estava murcho, frágil e suas asas apresentavam dobras finas, sem vigor. Ele esperava que a qualquer minuto as asas se abrissem e estendessem para suportar o voo, mas isso nunca aconteceu.\n\nA borboleta passou o resto de sua curta vida arrastando-se com dificuldade e asas atrofiadas, sem nunca conseguir alçar voo.\n\nO homem, em sua bondade ingênua, não compreendia que a barreira estreita do casulo e o imenso esforço exigido de passagem eram o método natural para bombear o fluido vital do corpo da borboleta direto ao interior de suas asas. Sem essa provação física, as asas nunca se fortaleceriam para o voo de glória. Às vezes, o obstáculo é exatamente o que nos prepara para voar.",
    tags: ["Superação", "Resiliência", "Propósito", "Crescimento"]
  },
  {
    id: "f-6",
    tipo: "frase",
    texto: "Dificuldades preparam pessoas comuns para destinos extraordinários.",
    autor: "C.S. Lewis",
    tags: ["Superação", "Resiliência", "Propósito"]
  },
  {
    id: "f-7",
    tipo: "frase",
    texto: "A simplicidade é o último grau de sofisticação.",
    autor: "Leonardo da Vinci",
    tags: ["Minimalismo", "Foco", "Consistência"]
  },
  {
    id: "f-8",
    tipo: "frase",
    texto: "Obstáculos são aquelas coisas assustadoras que você vê quando desvia os olhos do seu objetivo.",
    autor: "Henry Ford",
    tags: ["Foco", "Motivação", "Sucesso"]
  }
];

export const AVAILABLE_TAGS = [
  "Tudo",
  "Motivação",
  "Sucesso",
  "Consistência",
  "Paciência",
  "Mente",
  "Perspectiva",
  "Sabedoria",
  "Resiliência",
  "Propósito",
  "Adaptabilidade",
  "Aprendizado",
  "Crescimento",
  "Superação",
  "Minimalismo",
  "Foco"
];
