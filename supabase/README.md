# Supabase — MetaMensagem

## Setup local

```bash
npm install
supabase login
supabase link --project-ref zkugnthamuwsrvikymii
```

Copie `.env.example` → `.env.local` e preencha `VITE_SUPABASE_*`.

**Senha do Postgres (import local):** `npm run supabase:config` — pasta `setup-supabase/` (só digitar a senha).

## Migração inicial

1. Painel Supabase → **SQL Editor** → cole `migrations/20260603000000_initial_frases_schema.sql` → Run  
   **ou**
2. CLI: `supabase db push`

## Variáveis

| Variável | Onde | Uso |
|----------|------|-----|
| `VITE_SUPABASE_URL` | `.env.local` + Vercel (manual) | Client React (público) |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` + Vercel (manual) | Client React (público, RLS) |
| `SUPABASE_URL` | Vercel (integração Marketplace) | Mesmo que acima — fallback automático |
| `SUPABASE_ANON_KEY` | Vercel (integração Marketplace) | Mesmo que acima — fallback automático |
| `DATABASE_URL` | `.env.local` apenas | Scripts de import (sem `VITE_`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` / CI — **não** no bundle | Bypass RLS — nunca no frontend |

Guia completo Vercel: [docs/vercel-supabase.md](../docs/vercel-supabase.md)

## Client no app

```ts
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabaseClient';
```
