export interface ItemConteudo {
  id: string;
  tipo: 'frase' | 'metafora';
  texto: string;
  autor: string;
  tags: string[];
  slug?: string;
  titulo?: string;
  resumo?: string;
  imagem?: string;
}
