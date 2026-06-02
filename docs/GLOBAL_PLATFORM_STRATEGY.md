# MetaMensagem — Estratégia de plataforma global

## Visão

Plataforma global de frases e metáforas com **português como idioma-fonte canônico**, SEO internacional, traduções persistentes (nunca repetir o mesmo trabalho) e UI independente do idioma do conteúdo.

## Estado atual vs. alvo

| Pilar | Hoje | Alvo (esta entrega + roadmap) |
|-------|------|-------------------------------|
| Armazenamento | ~468k frases em shards `detail/`; texto único `frase_original` | PT canônico; `translations` por locale em shards dedicados |
| Tradução | MyMemory + `localStorage` (800 entradas) | IndexedDB + JSON estático + fila para build CI |
| UI vs conteúdo | Separados (`uiLocale` / `contentLocale`) | Mantido; reforçado com auto-tradução na URL |
| SEO | hreflang + sitemaps top 20k | Expandir sitemaps; meta/OG por locale |
| Popularidade | Campo `popularidade` na semântica | Eventos + pré-tradução dos top N |

## 1. Arquitetura de conteúdo

- **Idioma-fonte:** `pt` (`SOURCE_CONTENT_LOCALE` em `lib/i18n/platform.ts`).
- Frases permanecem em **um único registro** por slug; traduções em `translations[locale]`, não duplicar arquivos de frase.
- Shards de tradução espelham `detail/`: `public/frases-v2/translations/shard-XX.json`.
- Escala: mesma função `shardForSlug` para 400k+ entradas.

## 2. Detecção de idioma (UI)

Prioridade unificada (`resolveUiLocale`):

1. Prefixo na URL (`/en/...`)
2. `localStorage.lang`
3. `navigator.language(s)`
4. **Português** (fallback)

## 3. Tradução inteligente

Fluxo em `getOrCreatePhraseTranslation`:

1. Se `locale === pt` → texto original.
2. Cache memória → IndexedDB → shard estático.
3. Se ausente → `translationEngine` → validar → **persistir** (IndexedDB + fila local).
4. Nunca chamar API se já existir entrada válida.

## 4. Cache permanente

Camadas (da mais rápida à mais durável):

- L1: memória (sessão)
- L2: IndexedDB (`mm-phrase-translations-v1`)
- L3: `public/frases-v2/translations/shard-*.json` (CDN, imutável até deploy)
- Fila: `localStorage` `mm-translation-queue-v1` para script `npm run translations:merge`

## 5. Qualidade

- Validação existente no `translationEngine` (idioma destino, anti-quota MyMemory).
- Roadmap: segundo provedor (DeepL/OpenAI) só para fila de revisão / top frases.

## 6. SEO internacional

- URLs: `/frases/:slug` (x-default PT) e `/{locale}/frases/:slug`.
- hreflang + canonical já em `FraseDetalhe`.
- Próximo passo: sitemap completo por locale (não só top 20k).

## 7. UI ≠ conteúdo

- Interface: `react-i18next` + `useUiLocaleSync`.
- Conteúdo: `contentLocale` da URL + traduções persistidas.
- Ex.: UI em inglês, frase exibida em japonês se URL `/ja/frases/...` e tradução existir.

## 8. Popularidade

- `src/lib/analytics/phrasePopularity.ts` — eventos locais + hook para pré-tradução batch.
- Script futuro: `translations:prewarm --top=5000`.

## 9. Modelo de dados (alvo)

```json
{
  "id": "1001",
  "slug": "exemplo",
  "pt": "texto canônico",
  "translations": {
    "en": { "text": "...", "at": 1710000000, "from": "pt" }
  },
  "author": "...",
  "semantica": { "emotion": "...", "popularidade": 0 }
}
```

## 10–11. UX e escala

- Sem tradução síncrona em massa no primeiro paint da listagem.
- Tradução sob demanda + pré-aquecimento dos tops.
- Proxy `/api/translate` + shards estáticos = baixo custo marginal por pageview.

## Comandos

```bash
npm run translations:merge   # fila local → shards em public/
npm run frases:seo:all       # meta + sitemaps
```
