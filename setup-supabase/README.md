# Configurar Supabase (local)

Pasta dedicada: você **só digita a senha** do banco; o script testa a conexão e grava `DATABASE_URL` no `.env.local`.

## Como usar

Na raiz do projeto:

```bash
npm run supabase:config
```

Ou:

```bash
node setup-supabase/configurar.mjs
```

1. O terminal pede a **senha do Postgres** (entrada oculta).
2. A senha é tratada com `encodeURIComponent()` na URL.
3. O script conecta com `pg` e executa `SELECT 1`.
4. Se OK, grava `DATABASE_URL` em `.env.local` (arquivo ignorado pelo Git).

## Onde pegar a senha

[Supabase Dashboard](https://supabase.com/dashboard) → projeto **zkugnthamuwsrvikymii** → **Project Settings** → **Database** → **Database password**

Não use a chave **anon** / publishable (essa é para o site; prefixo `VITE_`).

## Depois da configuração

```bash
npm run frases:import:supabase:dry
npm run frases:import:supabase
```

## Segurança

- Nunca commite `.env.local`.
- Não coloque senha de Postgres em variáveis `VITE_*`.
