# Vercel + GitHub + Supabase (produção)

## Fluxo atual

```text
GitHub (push main) → Vercel Build → npm run build → deploy dist/
                              ↑
         Integração Supabase injeta env vars (Production + Preview)
```

Projeto Supabase: **zkugnthamuwsrvikymii**  
URL API: `https://zkugnthamuwsrvikymii.supabase.co`

## Integração Vercel ↔ Supabase

1. [Vercel Dashboard](https://vercel.com) → projeto **metamensagem**
2. **Integrations** → **Supabase** → projeto `zkugnthamuwsrvikymii`
3. Ambientes: **Production** e **Preview**

Variáveis típicas injetadas pela integração (o código aceita todas):

| Variável | Uso no MetaMensagem |
|----------|---------------------|
| `SUPABASE_URL` | URL do projeto (build + browser) |
| `SUPABASE_ANON_KEY` ou `SUPABASE_PUBLISHABLE_KEY` | Chave pública RLS |
| `NEXT_PUBLIC_SUPABASE_URL` | Mesmo (padrão Vercel/Next) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Mesmo |

**Não** expor no frontend: `POSTGRES_*`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`.

Resolução no código: `src/lib/supabase/publicEnv.ts`  
Validação no build: `build-scripts/check-vercel-supabase-env.mjs`

## GitHub

A integração Supabase na Vercel sincroniza secrets no deploy; **não** é necessário commitar `.env` no GitHub.

Opcional: [Supabase GitHub Integration](https://supabase.com/dashboard) para branches de preview — independente do app Vite.

## Build na Vercel

Log esperado:

```text
[build] Supabase OK (production, origem: SUPABASE_* (integração Vercel))
```

Se o build falhar na checagem Supabase, reinstale a integração ou adicione manualmente `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

## CSP (browser)

`vercel.json` inclui `connect-src` para `https://zkugnthamuwsrvikymii.supabase.co` (REST) e `wss://` (Realtime).

## Local

```bash
npm run supabase:config          # DATABASE_URL (import)
vercel env pull .env.production.local --environment=production  # espelhar Vercel
```

`.env.local`: `VITE_SUPABASE_*` para `npm run dev`.

## Checklist produção

- [ ] Integração Supabase ativa na Vercel (Production + Preview)
- [ ] Deploy com `[build] Supabase OK` nos logs
- [ ] Migração SQL aplicada (`supabase db push` ou SQL Editor)
- [ ] Dados em `public.frases` (`npm run frases:import:supabase` local)
- [ ] Página `/frases/:slug` carrega frase (sem fallback API)
- [ ] `DATABASE_URL` / service role **somente** local — nunca `VITE_*`

## Cadastro manual (fallback)

| Variável | Valor |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://zkugnthamuwsrvikymii.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | chave anon ou publishable (Dashboard → API) |
