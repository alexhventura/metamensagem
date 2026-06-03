# Vercel + GitHub + Supabase (produção)

## Fluxo atual

```text
GitHub (push main) → Vercel Build → npm run build → deploy dist/
                              ↑
         Environment Variables: somente VITE_SUPABASE_* (Production + Preview)
```

Projeto Supabase: **hnrulfjomufpxkitvfqg**  
URL API: `https://hnrulfjomufpxkitvfqg.supabase.co`

## Vercel — variáveis obrigatórias

Defina **manualmente** (ou desative variáveis perigosas da integração):

| Variável | Valor |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://hnrulfjomufpxkitvfqg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | chave **anon** ou **publishable** (Dashboard → API) |

**Remova** do deploy frontend (se a integração injetou):

- `NEXT_PUBLIC_*` (especialmente senha Postgres, service role, `DATABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_*`, `DATABASE_URL`

O Vite **não** expõe `NEXT_PUBLIC_*` nem `SUPABASE_*` no bundle (`envPrefix: ['VITE_']`).

Resolução no browser: `src/lib/supabase/publicEnv.ts`  
Validação no build: `build-scripts/check-vercel-supabase-env.mjs` (exige `VITE_*`)

## Build na Vercel

Log esperado:

```text
[build] Supabase OK (production, VITE_SUPABASE_*)
```

## CSP (browser)

`vercel.json` inclui `connect-src` para `https://hnrulfjomufpxkitvfqg.supabase.co` (REST) e `wss://` (Realtime).

## Local

| Arquivo | Conteúdo |
|---------|----------|
| `.env.local` | Só `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| `.env.scripts.local` | `POSTGRES_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, etc. (copie de `.env.scripts.example`) |

```bash
npm run dev
npm run supabase:config          # grava em .env.scripts.local
npm run supabase:bootstrap
```

## Checklist produção

- [ ] Vercel: só `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (sem secrets admin)
- [ ] Deploy com `[build] Supabase OK` nos logs
- [ ] Migração SQL aplicada
- [ ] Dados em `public.frases` (import já feito: 1838)
- [ ] `/frases/:slug` carrega via Supabase
