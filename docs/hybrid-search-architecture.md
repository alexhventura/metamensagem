# Arquitetura híbrida de busca (450k · custo zero Supabase)

## Princípio

| Camada | Onde | O quê |
|--------|------|--------|
| **Busca / listagem** | Supabase `frases_index` | `id`, `slug`, `titulo` (+ filtros categoria/tags) |
| **Detalhe** | Supabase `frases` (subset) + shards CDN | Texto completo, SEO, traduções |
| **Fallback** | `frasesModel.loadFraseDetailBySlug` | Invisível: tenta Supabase → shard JSON |

## Armazenamento (~500MB)

- Sem `explicacao`, `seo`, `semantica` no índice.
- `titulo` ≤ 160 caracteres; `palavras_busca` ≤ 12 termos.
- `tsvector` só em `titulo` + `palavras_busca` (GIN).

## Fluxo de dados

```text
public/frases-v2/index/*.json  ──┐
public/frases-v2/detail/*.json ──┼──► scripts/gerarIndiceBusca.js
                                   │         └── data/search-index/batches/*.json
                                   │                    └── (futuro) import em lote
                                   └──► frases_index no Postgres
```

## Código

- Migração: `supabase/migrations/20260603000001_search_and_metadata.sql`
- Busca: `src/lib/supabase/fraseSearchLoader.ts`
- API app: `src/lib/frasesModel.ts` (`searchFrasesByText`, `loadFraseDetailBySlug`)

## Comandos (local)

```bash
# 1. Aplicar migração (quando pronto)
npm run supabase:migrate

# 2. Gerar payloads (não grava no banco)
npm run frases:index:gerar

# 3. Import em lote (script futuro / service_role)
```

Não altera layout nem design — só substitui gradualmente a origem dos resultados de busca.
