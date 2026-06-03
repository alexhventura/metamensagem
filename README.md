<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/30e75f14-bbb0-4fda-8f6b-4566d121620c

## Supabase + Vercel (produção)

Deploy automático via GitHub → Vercel. Configure a [integração Supabase no Marketplace](https://vercel.com/integrations/supabase) ou variáveis `VITE_SUPABASE_*` no painel.

Detalhes, checklist e `vercel env pull`: **[docs/vercel-supabase.md](docs/vercel-supabase.md)**.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Adicionar frases ou metáforas (atualiza contadores e listagens)

O site carrega os índices `public/frases-index.json` e `public/metaforas-index.json`. Os contadores nas páginas **Frases** e **Metáforas** (ex.: `416 frases disponíveis`) vêm desses arquivos — não são números fixos no código.

**Sempre que cadastrar conteúdo novo:**

1. Edite o JSON de origem:
   - Frase → `public/frases.json`
   - Metáfora → `public/metaforas.json`
2. Regenere os índices e o build de produção:
   ```bash
   npm run build
   ```
   (equivale a `prepare-data.cjs` + sitemap + Vite)
3. Publique o deploy (ex.: push na `main` no Vercel).

Após o deploy, o total na interface atualiza sozinho na próxima visita.

**Comandos úteis**

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desenvolvimento local |
| `npm run build` | Índices + sitemap + bundle de produção |
| `npm run enrich-content` | Atualiza cache de frases externas (opcional) |
| `node prepare-data.cjs` | Só regenerar índices, sem build completo |
