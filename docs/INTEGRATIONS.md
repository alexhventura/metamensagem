# Integrações estratégicas — MetaMensagem

## Já integrado no código

| Sistema | Status | O que faz |
|---------|--------|-----------|
| **Google Analytics 4** | Aguarda ID no build | Eventos `phrase_view`, `phrase_copy`, `phrase_share`, `image_generate`, `translation_*`, `favorite_add` |
| **Microsoft Clarity** | Aguarda ID no build | Heatmaps e gravações (tag carregada com consentimento) |
| **IndexNow** | Aguarda chave | Após `frases:sitemap:intl` / `seo:indexnow` |
| **OG Image** | Ativo | `https://metamensagem.com/imagem/{phraseId}` — card premium 1200×630 |
| **Search Console** | Verificação HTML | Meta tag em `index.html` — painel é manual |

## O que precisamos de você (Vercel → Settings → Environment Variables)

### Obrigatório para analytics em produção

```
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

Obtenha em [Google Analytics](https://analytics.google.com/) → Admin → Fluxos de dados → Web.

### Recomendado

```
VITE_CLARITY_PROJECT_ID=xxxxxxxxxx
```

[Microsoft Clarity](https://clarity.microsoft.com/) → Settings → Setup.

```
INDEXNOW_KEY=sua-chave-aleatoria-32-chars
```

Gere uma string aleatória (ex. UUID sem hífens). O deploy criará `https://metamensagem.com/{INDEXNOW_KEY}.txt`.

### Já usados (tradução / ads)

```
MYMEMORY_EMAIL=seu@email.com
BLOB_READ_WRITE_TOKEN=...   # fila de tradução
```

## Google Search Console (manual)

1. Acesse [Google Search Console](https://search.google.com/search-console).
2. Propriedade: `https://metamensagem.com` (já há meta `google-site-verification` no site).
3. Envie o sitemap: `https://metamensagem.com/sitemap-index.xml`.
4. Monitore: consultas, páginas, cobertura por país/idioma.

Não há API OAuth configurada no repositório (evita complexidade); os relatórios ficam no painel Google.

## Fluxo semanal recomendado

```bash
npm run frases:sitemap:intl   # sitemaps + IndexNow (se INDEXNOW_KEY)
npm run translations:weekly
```

GitHub Actions: `Weekly translations` + sitemap local quando atualizar frases.

## Eventos GA4 (referência)

| Evento | Quando |
|--------|--------|
| `phrase_view` | Abertura da página da frase |
| `phrase_copy` | Copiar texto |
| `phrase_share` | Compartilhar link |
| `image_generate` | Exportar/compartilhar imagem premium |
| `translation_requested` | Pedido de tradução ao vivo |
| `translation_missing` | Tradução oficial ausente (contingência) |
| `translation_success` | Tradução exibida |
| `translation_fallback` | API esgotada, modo contingência |
| `favorite_add` | Reservado (favoritos futuros) |

Parâmetros comuns: `phrase_id`, `phrase_slug`, `locale`, `country`, `category`, `page_path`.
