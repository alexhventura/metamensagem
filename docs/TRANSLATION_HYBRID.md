# Tradução híbrida (tempo real + contingência)

## Modo normal

Enquanto a API MyMemory responde (sem cota/429/timeout), o site traduz em tempo real e persiste em IndexedDB + fila local para shards.

## Modo contingência

Ativado automaticamente por ~6h após cota, 429 ou indisponibilidade:

1. Exibe tradução **oficial** se existir em `public/frases-v2/translations/`.
2. Caso contrário: registra demanda (sem IP), mostra aviso amigável e sugere tradução do navegador.

## Analytics

Eventos (GA4 `gtag` / Clarity, se carregados):

- `translation_requested`
- `translation_missing`
- `translation_success`
- `translation_fallback`

## Fila de demanda (automatizada)

1. **Navegador**: `localStorage` (`mm-translation-demand-v1`) + sync automático (debounce 4s) para `POST /api/translation-demand`.
2. **Produção**: snapshot em **Vercel Blob** (`translation-demand/snapshot.json`) com `BLOB_READ_WRITE_TOKEN` no projeto Vercel.
3. **Repositório**: `data/translation-queue.json` atualizado pelo workflow semanal ou `npm run translations:pull-demand`.

### Vercel (uma vez)

- Criar Blob store no projeto → copiar `BLOB_READ_WRITE_TOKEN` para Environment Variables.
- Opcional: mesmo token em GitHub Actions secret para o workflow `Weekly translations`.

### Comandos

```bash
npm run translations:weekly    # pull + report + build + merge (local/CI)
npm run translations:pull-demand
```

## Arquivos

| Arquivo | Função |
|---------|--------|
| `src/lib/translation/translationQuota.ts` | Detecção de cota / cooldown |
| `src/lib/translation/translationDemand.ts` | Registro de demanda |
| `src/lib/analytics/translationAnalytics.ts` | Eventos GA4/Clarity |
| `data/translation-queue.json` | Fila agregada no CI |
| `data/translation-report.json` | Relatório gerado |
