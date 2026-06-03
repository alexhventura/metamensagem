# Supabase — MetaMensagem

## Setup local

```bash
npm install
supabase login
supabase link --project-ref zkugnthamuwsrvikymii
```

Copie `.env.example` → `.env.local` e preencha `VITE_SUPABASE_*`.

## Migração inicial

1. Painel Supabase → **SQL Editor** → cole `migrations/20260603000000_initial_frases_schema.sql` → Run  
   **ou**
2. CLI: `supabase db push`

## Variáveis

| Variável | Onde | Uso |
|----------|------|-----|
| `VITE_SUPABASE_URL` | `.env.local` + Vercel | Client React (público) |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Client React (público, RLS) |
| `DATABASE_URL` | `.env.local` apenas | Scripts de import (sem `VITE_`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel / CI apenas | Bypass RLS — nunca no frontend |

## Client no app

```ts
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabaseClient';
```
