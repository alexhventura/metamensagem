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

## Erro: "Provisioning integrations failed" (build 0–1s)

Esse erro **não é falha de código**. O deploy para **antes** do `npm run build` porque a Vercel não consegue provisionar a integração Supabase.

### Sintomas

- Status: **Error** em ~1s
- Mensagem: `Provisioning integrations failed` / `Resource provisioning failed`
- Log: `supabase-aqua-kettle`, `supabase-cordovan-planet`, **Supabase Preview Branch**

### Causas comuns

1. **Duas integrações Supabase** no mesmo projeto Vercel (conflito)
2. **Limite de branches** no plano Supabase (preview branches acumuladas)
3. Integração **desconectada** ou apontando para projeto Supabase errado
4. Variáveis da integração (`POSTGRES_*`, `SERVICE_ROLE`) conflitando com `VITE_*`

### Correção (Vercel Dashboard)

1. **Project → Settings → Integrations**
2. Remova integrações Supabase **duplicadas** — deixe **no máximo uma**, ligada ao projeto `hnrulfjomufpxkitvfqg`
   - Alternativa recomendada para este repo: **desconectar** a integração Supabase e usar só env vars manuais (abaixo)
3. **Settings → Environment Variables** — confirme em **Production** e **Preview**:
   - `VITE_SUPABASE_URL` = `https://hnrulfjomufpxkitvfqg.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = chave anon do Dashboard Supabase
4. **Remova** variáveis perigosas injetadas pela integração:
   - `POSTGRES_*`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_*`
5. **Supabase Dashboard** → Branches: apague preview branches antigas (`preview/*`) se estiver no limite do plano
6. **Deployments → Redeploy** o commit `main` (⋯ → Redeploy)

### Log de sucesso esperado

```text
[build] Supabase OK (production, VITE_SUPABASE_*)
✓ built in …
```

### Se persistir

- Confirme que o projeto Vercel correto está ligado ao domínio `metamensagem.com` (não só um projeto de teste)
- Integrations → Supabase → **Reconnect** ou remova e configure `VITE_*` manualmente
- Suporte Vercel: deployment id (ex.: `dpl_3viXe8ZPDbYBqpSSa6Km8LYrQQpR`)
