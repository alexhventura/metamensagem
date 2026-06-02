# Gerador de imagens premium — MetaMensagem

## Conceito visual

**Soft Premium**: minimalismo editorial, vinheta suave, logo como marca d'água (~42% opacidade), frase dominante, rodapé discreto na margem inferior.

## Safe zone

Definida em `utils/safeZone.ts`:

- ~11% altura: cabeçalho (logo)
- ~7,5% altura: rodapé (metamensagem.com · skin · serial)
- ~8% largura: margens laterais
- Área central exclusiva para citação + autor

`computeImageLayout` reduz fonte e linhas até caber na safe zone.

## Rodapé institucional

```
metamensagem.com    {Skin}    MMM-2026-00001234
```

- Serial de preview: estável por `quote.id`
- Serial de exportação: `allocateImageSerial()` — único por download/compartilhar

## Skins semânticas

| Coleção | Intenção | Paleta fixa |
|---------|----------|-------------|
| Motivação | Luz, horizonte | Âmbar / céu |
| Amor | Romântico | Rosa |
| Reflexão | Neutro sofisticado | Stone / zinc |
| Metáforas | Artístico | Violeta / teal |
| Superação | Energia | Laranja / verde |

Coleções legadas (Elementos, Fortuna, etc.) permanecem disponíveis.

## Formatos premium (ordem UI)

1. Quadrado 1080×1080  
2. Story 1080×1920  
3. Retrato 1080×1350  
4. Paisagem 1920×1080  
5. Wallpaper 1440×2560  

## Metadados

`recordImageGeneration` grava em `localStorage` (`mm-image-generation-log-v1`): id da frase, categoria, skin, locale, formato, serial, data.

Atributos `data-mm-*` no DOM do cartão para auditoria e export.

## Compartilhar

Botão principal: **Compartilhar** (Web Share API quando disponível).
