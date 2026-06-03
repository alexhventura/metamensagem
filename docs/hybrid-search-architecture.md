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
translation_requests / metrics ──┘    (modos popular | on-demand | combined — não full no free tier)
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

## Estratégia de índice (free tier ~500 MB)

| Modo | O quê |
|------|--------|
| `popular` (padrão npm backfill) | Top `--top=10000` por `frases_index.popularidade` |
| `on-demand` | `translation_requests`, traduções recentes, `frase_metrics*`, `get_top_frases` |
| `combined` | União popular + on-demand — **cron diário** |
| `full` | Scan completo (~467k) — só com `--i-understand-storage-risk` e DB &lt; 500 MB |

Hooks em tempo real: `refreshFraseSearchIndexAfterTranslation` após tradução API; backfill não reindexa 8 idiomas por frase — só línguas existentes (`buildSearchIndexRowsForPhrase`).

## Comandos (local)

```bash
# 1. Aplicar migrações
npm run supabase:migrate

# 2. Importar frases_index (se ainda não feito)
npm run frases:index:gerar
npm run frases:index:importar

# 3. Backfill índice multilíngue (seguro)
npm run frases:search-index:backfill          # --mode=popular, top 10k
npm run frases:search-index:refresh-demand    # cron: combined
npm run frases:search-index:backfill:combined:dry

# Auditoria tamanho / índices
npm run supabase:audit-size
npm run supabase:audit-indexes

# Legado (perigoso no free tier):
# node scripts/backfillFraseSearchIndex.mjs --mode=full --i-understand-storage-risk

# 4. Verificar
npm run supabase:check-db
```

### Cron sugerido (Vercel / GitHub Actions / crontab)

```bash
# Diário — mantém top 10k + frases com demanda
npm run frases:search-index:refresh-demand
```

Não altera layout nem design — só enriquece resultados de busca cross-language.

## Phase 2 (futuro)

- Embeddings pgvector (`frases.embedding`) para busca semântica offline
- Expansão automática de sinônimos a partir de coocorrência
- Sitemap de termos de busca por locale (`/en/search?q=love`)
