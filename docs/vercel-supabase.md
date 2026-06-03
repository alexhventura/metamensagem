# Vercel ↔ Supabase (produção)

## Integração oficial (recomendado)

1. [Vercel Dashboard](https://vercel.com) → seu projeto **metamensagem**
2. **Integrations** → **Supabase** (Marketplace) → **Add Integration**
3. Vincule o projeto Supabase `zkugnthamuwsrvikymii`
4. Marque os ambientes **Production** e **Preview**
5. A Vercel injeta automaticamente (sem prefixo `VITE_`):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

O frontend resolve essas variáveis em `src/lib/supabase/publicEnv.ts` (fallback após `VITE_*`).

## Cadastro manual (alternativa)

Em **Settings → Environment Variables**, adicione para Production/Preview:

| Variável | Valor |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://zkugnthamuwsrvikymii.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | chave **anon / publishable** (Dashboard → API) |

Nunca adicione `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` nem senha Postgres com prefixo `VITE_`.

## Build na Vercel

O script `scripts/check-vercel-supabase-env.mjs` roda no início de `npm run build`:

- Em **Vercel Production/Preview**: falha o build se URL + anon key estiverem ausentes (evita deploy silencioso).
- Local: apenas aviso se faltar config em build de produção.

## Sincronizar env na máquina (Vercel CLI)

Requisitos: `vercel login` e projeto linkado (`vercel link`).

```bash
vercel env pull .env.production.local --environment=production
```

O arquivo gerado está no `.gitignore` — **não commite**.

Para desenvolvimento local, continue usando `.env.local` com `VITE_SUPABASE_*` e `DATABASE_URL` (só scripts de import).

## Checklist pós-conexão

- [ ] Integração Supabase ativa no projeto Vercel (ou variáveis `VITE_*` preenchidas)
- [ ] Deploy de produção passa em `npm run build` (log `[build] Supabase OK`)
- [ ] Página de detalhe de frase carrega com RLS (sem fallback API/shards)
- [ ] `DATABASE_URL` e service role **apenas** em `.env.local` / scripts locais — nunca no painel com `VITE_`
- [ ] Migração SQL aplicada no Supabase e dados importados (`npm run frases:import:supabase`)

## Pipeline GitHub → Vercel

Push na branch conectada (ex.: `main`) dispara deploy automático. Nenhum secret de Postgres vai no repositório; a Vercel lê as variáveis do painel/integração no momento do build.
