# MASTER PROMPT — MetaMensagem Image Engine V3 (Soft Premium Signature)

> Prompt definitivo para evolução visual do gerador de imagens.  
> **Não é redesign.** É uma camada visual sobre a arquitetura que já funciona.

---

## Objetivo

Evoluir o gerador de imagens do Metamensagem para um padrão **Soft Premium Signature** — editorial, premium, compartilhável — incorporando os melhores elementos do modelo de referência (respiro, logo discreto, rodapé estruturado, formas geométricas suaves, marca d'água institucional), **sem alterar fluxos, formatos, exportação, APIs ou UX do modal**.

Sensação final: *"Arte criada por agência premium de conteúdo editorial."*

---

## Princípios obrigatórios (NÃO negociáveis)

### Não alterar

| Área | Motivo |
|------|--------|
| `ImageGeneratorModal.tsx` — fluxo e props | UX aprovada |
| `exportImage.ts` — pipeline de captura | Estável |
| `formats.ts` — dimensões e ordem UI | Compatibilidade social |
| `serialGenerator.ts` — formato `MMM-{ano}-{8 dígitos}` | Identidade existente |
| `assertExportTextIntegrity` / `validateFullText` | Integridade de texto |
| Coleções legadas em `skins/data.ts` | Retrocompatibilidade |
| Atributos `data-mm-*` existentes | Analytics/auditoria |

### Apenas evoluir

- Aparência de `ImageRenderer.tsx`
- Tokens visuais em `skins/semanticCollections.ts` (+ extensão opcional em `types.ts`)
- Cálculos em `utils/textLayout.ts` e `utils/safeZone.ts` (proporções, não zonas fixas)
- Paridade visual em `api/og/frase.tsx` (OG cards)

---

## Mapa da arquitetura atual → V3

```
ImageGeneratorModal
  → ImageRenderer (canvas DOM)
       → safeZone.ts        — HEADER | QUOTE | AUTHOR | FOOTER
       → textLayout.ts      — wrap, escala, rodapé responsivo
       → skins/*.ts         — bgClass, palette, cardStyle
       → exportImage.ts     — modern-screenshot
```

**Único ponto de render:** `src/components/image-generator/ImageRenderer.tsx`  
**Único ponto de layout numérico:** `utils/textLayout.ts` + `utils/safeZone.ts`  
**Único ponto de paleta:** `skins/semanticCollections.ts` (+ `skins/data.ts` legado)

---

## Arquitetura visual em 6 camadas (implementar em ImageRenderer)

Ordem z-index (de trás para frente):

| Camada | Nome | Implementação | Opacidade / regra |
|--------|------|---------------|-------------------|
| L1 | Background gradiente | `skin.bgClass` + `skin.cardStyle.backgroundImage` | Paleta fixa por skin |
| L2 | Formas decorativas | **NOVO** `DecorLayer` — 2–3 círculos/blurs CSS absolutos | 4–12%, nunca sobre texto |
| L3 | Marca d'água | **NOVO** `WatermarkLayer` — logo SVG ou "M" tipográfico | 3–5%, centro ou diagonal leve |
| L4 | Frase | `blockquote` existente | Prioridade máxima |
| L5 | Autor | `[data-mm-author-zone]` | +15–20% font-size vs atual |
| L6 | Rodapé institucional | `footer` — layout premium em 2 linhas | Sempre legível |

**Manter** overlays existentes (vinheta radial + grain 4%) — são parte do Soft Premium.

---

## Camada 2 — Elementos decorativos

Inspirados no modelo de referência (círculos suaves, profundidade).

```tsx
// Novo: utils/decorativeLayer.ts ou inline em ImageRenderer
// Ler posições/tamanhos de skin.signature?.orbs ou defaults por palette.primary
```

Regras:

- 2 círculos grandes + 1 menor, `filter: blur(40–80px)`, posições fixas por perfil de formato (`resolveFooterFormatProfile`)
- Cores derivadas de `skin.palette.accent` e `skin.palette.secondary`
- `pointer-events-none`, z-index entre background e watermark
- **Proibido:** cruzar `quoteZone`, `authorZone`, `footer`

---

## Camada 3 — Marca d'água premium

Hoje: logo no header com `opacity: 0.42` (`layout.logoPx`).

**Adicionar** (sem remover header logo):

- Segunda instância central ou diagonal (`rotate(-18deg)`), escala ~2.5× logo header
- Asset: `/brand/logo.svg` ou glyph "M" em `fontFamily` institucional
- Opacidade: `0.03` – `0.05` (claro) / `0.04` – `0.07` (skins escuras)
- z-index: 5 (atrás da frase z-20)

Função: proteção de marca + identidade; **nunca competir com a frase**.

---

## Camada 4 — Frase (texto dominante)

### Respiro (35–45% da arte)

Ajustar em `safeZone.ts` / `textLayout.ts`:

- Aumentar `quoteZoneHeight` mínimo de `0.18` → **`0.22–0.28`** da altura (density-aware)
- Reduzir levemente `header` em density `normal` se quoteZone crescer
- `maxWidth` do blockquote: **`70%`** do canvas (hoje 100% da quote zone)

### Escala automática por linhas

Estender `computeImageLayout` (já tem LONG/EXTREME por chars):

| Linhas | Comportamento |
|--------|---------------|
| ≤ 3 | Fonte máxima (+8% vs baseline atual) |
| 4–5 | Baseline atual |
| 6–8 | −10% progressivo |
| > 8 | Modo `long`/`extreme` existente |

### Tipografia

- Manter `imageFontFamilyFor()` — não trocar família
- `text-shadow`: `0 2px 12px rgba(0,0,0,0.25)` (substituir shadow atual mais suave)
- `font-weight: 700` frase; tracking `-0.02em` opcional em frases curtas
- Aspas tipográficas `" "` — já implementadas

---

## Camada 5 — Autor

Arquivo: `ImageRenderer.tsx` + `textLayout.ts` (`authorPx`).

| Propriedade | Atual | V3 |
|-------------|-------|-----|
| Tamanho | `layout.authorPx` | **`× 1.18`** (clamp por density) |
| Peso | `font-medium` (500) | **500–600** |
| Espaço superior | `zoneGap` | **`zoneGap × 1.15`** quando autor presente |
| Largura | `maxWidth: 70%` | manter |
| Formato | `— {autor}` | manter |

Deve parecer **assinatura editorial**, não rodapé secundário.

---

## Camada 6 — Rodapé premium (principal mudança visual)

### Problema atual

Grid 3 colunas: `metamensagem.com | {Skin} | MMM-…` — skin no centro compete com branding; serial pequeno (`opacity: 0.6`).

### Novo padrão (2 linhas)

```
────────────────────────────
metamensagem.com
{Categoria} ◈ {Serial}
────────────────────────────
```

**Linha 1:** domínio, lowercase, `font-weight: 500`, `opacity: 0.78`  
**Linha 2:** categoria humanizada (de `quoteMeta.categoria` ou `skin.category`) + separador `◈` + serial  
**Separador:** `◈` (U+25C8) — marca premium discreta  
**Hairline:** `border-top: 1px solid rgba(255,255,255,0.14)` (já existe; reforçar contraste em skins claras via `skin.palette.contrast`)

### Responsividade (já parcialmente em `textLayout.ts`)

| Perfil | Arquivo helper | Rodapé |
|--------|----------------|--------|
| square 1:1 | `resolveFooterFormatProfile` | 2 linhas centralizadas |
| portrait 4:5 | idem | idem |
| story 9:16 | idem | fonte +2px (`FOOTER_META_BY_PROFILE.story`) |
| horizontal 16:9 | `isWideFooter` | manter stack 2 linhas (já existe branch) |

**Remover** coluna central com nome da skin do rodapé — skin fica implícita na paleta; categoria substitui no metadado.

Funções a estender:

- `computeFooterFontSize()` — subir mínimos: meta 20→22px, serial 18→20px em story
- `truncateFooterLabel()` — aplicar só ao serial se > coluna
- Nova: `formatFooterCategory(categoria: string): string` — capitalize, max 24 chars

Serial: manter `MMM-{year}-{8 digits}` de `serialGenerator.ts`.  
Exemplo exibido: `Reflexão ◈ MMM-2026-00001234`

---

## Coleção Soft Premium Signature — mapeamento de temas

**Não duplicar skins.** Evoluir paletas em `semanticCollections.ts` + adicionar `signature` opcional em `SkinConfig`:

```ts
export interface SkinSignature {
  orbs?: { x: string; y: string; size: string; color: 'primary' | 'accent' | 'secondary' }[];
  watermarkScale?: number;
  watermarkOpacity?: number;
}
```

### Famílias visuais (alias → skin existente)

| Família V3 | Gradiente alvo | Skin(s) a evoluir | Uso semântico |
|------------|----------------|-------------------|---------------|
| **Aurora** | Roxo → Magenta → Índigo | `aurora`, `atelie` | reflexão, filosofia, metáforas |
| **Ocean** | Azul → Turquesa → Ciano | `agua-profunda`, `horizonte` | calma, sabedoria |
| **Forest** | Verde → Esmeralda → Oliva | `vitoria`, `neutro` (variante verde) | natureza, espiritualidade |
| **Sunset** | Laranja → Dourado → Vermelho suave | `ascensao`, `aurora` (warm) | motivação, sucesso |
| **Midnight** | Preto → Azul profundo | `noite`, `horizonte` | contemplação noturna |

Cada skin mantém `id` atual — **zero breaking change** no `recommendSkin.ts` e logs.

---

## Safe zones — validação por formato

Arquivo: `utils/safeZone.ts`

Formatos em `formats.ts` (todos devem passar screenshot test):

- `feed` 1080×1080
- `portrait` / `linkedin` 1080×1350
- `story` / `wallpaper_mobile` 1080×1920 / 1440×2560
- `twitter` / `wallpaper_desktop` 1600×900 / 1920×1080
- `facebook` 1200×628
- `pinterest` 1000×1500

Checklist por formato:

- [ ] Logo header visível, não cortado
- [ ] Marca d'água não sobrepõe frase legível
- [ ] Autor acima do rodapé, nunca cortado
- [ ] Rodapé 2 linhas legível (meta ≥ 18px effective em preview 1080p)
- [ ] Frase ocupa ~35–45% área visual central
- [ ] `assertExportTextIntegrity` passa

---

## Header — logo discreto (refinar, não substituir)

Manter `/brand/logo.svg` no header.

Ajustes V3:

- Opacidade header: `0.42` → **`0.38`** (referência: ícone sem texto compete menos)
- `drop-shadow` suave mantido
- Opcional: ocultar wordmark se SVG tiver texto — usar só símbolo

---

## OG / API paridade

Arquivo: `api/og/frase.tsx`

Replicar apenas tokens visuais críticos (gradiente, rodapé 2 linhas, serial) — Satori constraints.  
Não portar blur/orbs pesados se degradar performance.

---

## Ordem de implementação (para o agente Cursor)

### Fase A — Layout & tipografia (zero risco)

1. `safeZone.ts` — quote zone + author gap
2. `textLayout.ts` — maxWidth 70%, escala por linhas, authorPx ×1.18, footer font mins
3. `ImageRenderer.tsx` — text-shadow, maxWidth blockquote

### Fase B — Rodapé premium

4. `ImageRenderer.tsx` — layout 2 linhas + `◈` + categoria
5. `textLayout.ts` — helpers de categoria
6. Testar horizontal (`isWideFooter`) e story

### Fase C — Camadas visuais

7. `types.ts` — `SkinSignature` opcional
8. `semanticCollections.ts` — paletas Aurora/Ocean/Forest/Sunset/Midnight
9. `ImageRenderer.tsx` — `DecorLayer` + `WatermarkLayer`
10. `utils/decorativeLayer.ts` (novo, puro CSS-in-JS)

### Fase D — Validação

11. `npm run lint`
12. Gerar 3 frases × 5 formatos × 2 skins — screenshot manual
13. `api/og/frase.tsx` — rodapé alinhado

---

## Critérios de aceite (Definition of Done)

- [ ] Aparência premium perceptível vs versão atual (side-by-side)
- [ ] Marca d'água visível só ao zoom; frase domina
- [ ] Rodapé legível em story 9:16 e facebook 1.91:1
- [ ] Autor ~18% maior, elegante
- [ ] Zero regressão: export PNG, share, serial, recommendSkin
- [ ] Texto nunca truncado (`data-mm-text-integrity=ok`)
- [ ] Nenhuma alteração em API, banco, SEO, rotas

---

## Anti-patterns (proibido)

- Copiar pixel-a-pixel o modelo de referência
- Cores aleatórias ou gradientes agressivos
- Marca d'água > 8% opacidade
- Orbs sobre texto
- Remover serial ou domínio
- Novo modal / novo fluxo de export
- Breaking change em `SkinConfig.id`

---

## Referência rápida de arquivos

| Arquivo | Responsabilidade V3 |
|---------|---------------------|
| `ImageRenderer.tsx` | Camadas, rodapé, watermark, decor |
| `utils/safeZone.ts` | Proporções HEADER/QUOTE/AUTHOR/FOOTER |
| `utils/textLayout.ts` | Escala frase, footer fonts, wrap |
| `skins/semanticCollections.ts` | Paletas Signature |
| `types.ts` | `SkinSignature` |
| `formats.ts` | Inalterado |
| `exportImage.ts` | Inalterado |
| `serialGenerator.ts` | Inalterado |
| `api/og/frase.tsx` | Paridade rodapé |
| `docs/IMAGE_GENERATOR_PREMIUM.md` | Atualizar após merge |

---

## Prompt de execução (copiar para o agente)

```
Implemente MetaMensagem Image Engine V3 (Soft Premium Signature) seguindo
docs/IMAGE_ENGINE_V3_SOFT_PREMIUM_SIGNATURE.md.

Escopo: Fases A→C. Não altere modal, export, formats, serial, APIs.

Prioridade:
1. Rodapé 2 linhas (metamensagem.com + Categoria ◈ Serial)
2. Frase max-width 70%, respiro 35–45%, author +18%
3. Marca d'água central 3–5% + orbs decorativos 4–12%
4. Paletas Signature nas skins semânticas existentes

Validar lint + integridade de texto em feed, story, facebook horizontal.
```

---

*MetaMensagem — evolução visual, arquitetura intacta.*
