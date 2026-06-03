# Configurar Supabase (local)

Dois arquivos de ambiente:

| Arquivo | Uso |
|---------|-----|
| `.env.local` | Frontend Vite — **só** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| `.env.scripts.local` | Scripts — senha Postgres, service role (copie `.env.scripts.example`) |

## Como usar

`.env.local`:

```env
VITE_SUPABASE_URL=https://hnrulfjomufpxkitvfqg.supabase.co
VITE_SUPABASE_ANON_KEY=chave-anon-do-dashboard-api
```

`.env.scripts.local`:

```env
SUPABASE_PROJECT_REF=hnrulfjomufpxkitvfqg
POSTGRES_PASSWORD=sua-senha-do-painel
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Depois:

```bash
npm run supabase:migrate
npm run supabase:bootstrap
```

**Pooler (recomendado no Windows):** após definir `POSTGRES_PASSWORD`:

```bash
npm run supabase:sync-db-url
npm run supabase:migrate
```

Ou cole manualmente em `.env.scripts.local`:

```env
DATABASE_URL=postgresql://postgres.hnrulfjomufpxkitvfqg:SUA_SENHA_NOVA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

**Prompt de senha no PowerShell:** só em `npm run supabase:config`.  
`migrate`, `bootstrap` e `sync-db-url` usam apenas `.env.scripts.local` (sem pedir senha de novo).

## Onde pegar a senha

[Supabase Dashboard](https://supabase.com/dashboard/project/hnrulfjomufpxkitvfqg) → **Project Settings** → **Database** → **Database password**

Não use a chave **anon** / publishable em `.env.scripts.local` (essa vai em `VITE_SUPABASE_ANON_KEY`).

## Segurança

- Nunca commite `.env.local` nem `.env.scripts.local`.
- Não coloque senha de Postgres nem service role em variáveis `VITE_*`.
