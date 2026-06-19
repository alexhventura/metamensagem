# Deploy Vercel (modo CDN-only)

## Fluxo atual

```text
GitHub (push main) → Vercel Build → npm run build → deploy dist/
                              ↑
         Sem Supabase obrigatório — dados em public/frases-v2/
```

O app funciona **sem integração Supabase** na Vercel:

| Recurso | Fonte |
|---------|--------|
| Detalhe de frase | `public/frases-v2/detail/shard-*.json` + `id-index.json` |
| Busca / listagem | `public/frases-v2/index/shard-*.json` (467k) + `feed-sample.json` (4k) |
| Tradução na UI | Botão nativo do browser (“Ler no meu idioma”) |
| Sitemaps / SEO | Arquivos estáticos em `public/` |

## Build na Vercel

Log esperado:

```text
[build] CDN-only OK (production) — busca e detalhe via public/frases-v2/
```

**Não é necessário** definir `VITE_SUPABASE_*` para o deploy. Se a integração Supabase estiver instalada no projeto Vercel e causar `Provisioning integrations failed`, remova as integrações duplicadas em **Settings → Integrations** e mantenha apenas o deploy estático.

## Variáveis — o que NÃO colocar no frontend

Remova do ambiente de **Production** e **Preview** (se a integração injetou):

- `NEXT_PUBLIC_*` (Postgres, JWT secret, etc.)
- `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_*`, `DATABASE_URL`

O Vite só expõe variáveis com prefixo `VITE_` (`envPrefix: ['VITE_']`).

## CSP (browser)

`vercel.json` **não** inclui `connect-src` para Supabase — o cliente não faz chamadas REST/Realtime ao banco.

## Supabase (opcional / legado)

Scripts em `setup-supabase/` e `supabase/migrations/` permanecem para quem quiser reindexar ou operar um backend separado, mas **não fazem parte do caminho crítico de produção**.

```bash
npm run dev
npm run build
npm run test:critical
```

## Checklist produção

- [ ] Vercel: integração Supabase removida ou desativada (evita falha de provisionamento)
- [ ] Build passa com log `CDN-only OK`
- [ ] Busca na home retorna resultados além do feed de 4k
- [ ] Páginas `/categoria/*` paginam via índice estático
- [ ] Detalhe `/frase/*` carrega via shards CDN
