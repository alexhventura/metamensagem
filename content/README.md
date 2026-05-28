# MetaMensagem — CMS file-based

JSON é a única fonte de dados. Sem banco de dados.

## Estrutura

```
content/
  frases/frases.json       # CMS principal
  categorias/categorias.json
  contextos/contextos.json
  autores/autores.json
```

## Formato de frase

```json
{
  "id": "f_001",
  "slug": "persistencia-e-o-caminho-do-exito",
  "frase_original": "A persistência é o caminho do êxito.",
  "autor_original": "Charles Chaplin",
  "categoria": "motivacao",
  "contextos": ["superacao", "dias-dificeis"],
  "ano_ou_data": "1950",
  "explicacao": "Mostra que resultados vêm da persistência contínua.",
  "fontes": "Coletâneas motivacionais",
  "observacao": null,
  "palavras_chave": ["persistencia", "foco", "sucesso"],
  "autor_tipo": "ator-diretor",
  "nacionalidade": "britanico",
  "nascimento_falecimento": "1889-1977",
  "informacoes": {
    "ultima_atualizacao": "2026-05-28",
    "confiabilidade": "alta"
  }
}
```

Campo legado `"a frase foi dita em"` é migrado automaticamente para `ano_ou_data`.

## Sincronizar do acervo legado

```bash
npm run content:sync
```

## Next.js (SEO + API)

```bash
npm run next:dev    # http://localhost:3001
npm run next:build
```

- `GET /api/frases?categoria=&contexto=&autor=&search=`
- `GET /api/frases/[slug]`
- Páginas: `/frases/[slug]`, `/categorias/[categoria]`, `/contextos/[contexto]`, `/autores/[autor]`

O site Vite (produção atual) continua em `npm run dev` / `npm run build`.
