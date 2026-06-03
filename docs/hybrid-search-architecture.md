# Arquitetura híbrida de busca (450k · custo zero Supabase)

## Princípio

| Camada | Onde | O quê |
|--------|------|--------|
| **Busca / listagem** | Supabase `frases_index` + `frase_search_index` | `id`, `slug`, `titulo` (+ filtros categoria/tags) |
| **Busca multilíngue** | `frase_search_index` | Uma linha por `(frase_id, language)` — consulta democrática |
| **Detalhe** | Supabase `frases` (subset) + shards CDN | Texto completo, SEO, traduções |
| **Fallback** | `frasesModel.loadFraseDetailBySlug` | Invisível: tenta Supabase → shard JSON |

## Armazenamento (~500MB)

- Sem `explicacao`, `seo`, `semantica` no índice.
- `titulo` ≤ 160 caracteres; `palavras_busca` ≤ 12 termos.
- `frase_search_index.search_text` ≤ 480 chars; `keywords` ≤ 24 termos.
- `tsvector` (GIN) em ambos os índices.

## Fluxo de dados

```text
public/frases-v2/index/*.json  ──┐
public/frases-v2/detail/*.json ──┼──► scripts/gerarIndiceBusca.js → frases_index
frases_traducoes (8 locales)   ──┼──► scripts/backfillFraseSearchIndex.mjs → frase_search_index
                                   └──► RPC mm_search_frases_index (democrática)
```

## Busca democrática (Phase 1)

- RPC `mm_search_frases_index` consulta **todas** as linhas de `frase_search_index` (qualquer idioma).
- Também busca em `frases_index` (título + `palavras_busca`).
- Sinônimos temáticos estáticos: `lib/search/crossLangThemes.json` (amor/love/amour, etc.).
- Boost opcional para `p_locale` (idioma da UI).

## Código

- Migrações: `supabase/migrations/20260603000001_search_and_metadata.sql`, `20260603110000_frase_search_index.sql`
- Keywords: `lib/search/buildSearchIndexRow.mjs`
- Busca cliente: `src/lib/supabase/fraseSearchLoader.ts`
- Hooks: `api/fraseSearchIndexService.ts`, `api/phraseTranslationService.ts`

## Comandos (local)

```bash
# 1. Aplicar migrações
npm run supabase:migrate

# 2. Importar frases_index (se ainda não feito)
npm run frases:index:gerar
npm run frases:index:importar

# 3. Backfill índice multilíngue
npm run frases:search-index:backfill
# amostra: node scripts/backfillFraseSearchIndex.mjs --limit=5000 --dry-run
# shards CDN: node scripts/backfillFraseSearchIndex.mjs --source=shards

# 4. Verificar
npm run supabase:check-db
```

Não altera layout nem design — só enriquece resultados de busca cross-language.

## Phase 2 (futuro)

- Embeddings pgvector (`frases.embedding`) para busca semântica offline
- Expansão automática de sinônimos a partir de coocorrência
- Sitemap de termos de busca por locale (`/en/search?q=love`)
