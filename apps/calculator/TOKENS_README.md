# Design Tokens · OnSite Calculator v2

Sistema de design unificado baseado em **pressure plate** — superfícies côncavas
que simulam botões físicos de instrumento técnico.

## Onde vive

- **`src/styles/tokens.ts`** — fonte de verdade (tipado, com `@author` header).
- **`src/styles/tokens.generated.css`** — saída do script (git-ignored, regenerado
  em `npm run dev` e `npm run build` via `prebuild`/`predev`).
- **`scripts/generate-css-vars.ts`** — scan de `var(--foo)` em todo `src/`, emite
  só os tokens em uso. Fallback: emite o set completo quando ninguém consome
  ainda (estado atual durante o refactor).
- **`TOKENS_README.md`** (este arquivo) — regras de uso + anti-padrões.

Fontes (`@fontsource/geist`, `@fontsource/jetbrains-mono`) já estão no
`package.json`. Importe no `main.tsx` quando a Fase 3 começar:

```ts
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles/tokens.generated.css';  // injeta :root { --color-…: …; }
```

Regeneração manual (opcional, `npm run dev`/`build` já chamam):

```bash
npm run tokens
```

## Uso — três formas

### 1. CSS variables (recomendado pra CSS puro e styled-components)

No `index.css`, injete as variáveis:

```ts
// src/styles/globals.css.ts ou similar
import { cssVars } from './tokens';

document.head.insertAdjacentHTML('beforeend', `
  <style>:root { ${cssVars} }</style>
`);
```

Depois use normalmente:

```css
.keycap {
  background: var(--gradient-key-rest);
  border-radius: var(--radius-key);
  box-shadow: var(--shadow-key);
  transition: all var(--transition-base);
}

.keycap:active {
  background: var(--gradient-key-pressed);
  box-shadow: var(--shadow-key-pressed);
  transform: translateY(0.5px);
}
```

### 2. Tokens tipados (recomendado pra componentes TypeScript)

```tsx
import { color, gradient, shadow, radius } from '@/styles/tokens';

const KeyButton = styled.button`
  background: ${gradient.keyRest};
  border-radius: ${radius.key};
  box-shadow: ${shadow.key};
  color: ${color.text.strong};

  &:active {
    background: ${gradient.keyPressed};
    box-shadow: ${shadow.keyPressed};
  }
`;
```

### 3. Presets compostos (mais rápido pra prototipar)

```tsx
import { preset } from '@/styles/tokens';

<button style={preset.keyRest}>7</button>
<div style={preset.cardElevated}>Display</div>
<div style={preset.badgeArea}>● Área</div>
```

## Os 3 comportamentos fundamentais

Todo elemento segue uma das três regras:

| Comportamento | Quando usar | Tokens |
|---|---|---|
| **ACIONA** (elevado) | Botões, keycaps, tabs ativas, avatar | `gradient.keyRest` + `shadow.key` |
| **RECEBE** (rebaixado) | Input, transcrição, histórico inativo | `color.surface.inset` + `shadow.inset` |
| **EMERGE** (sutil) | Cards de display, histórico ativo | `gradient.cardRest` + `shadow.card` |

Se um elemento não encaixa em nenhuma das três, reconsidere o design — provavelmente
está tentando criar uma 4ª linguagem visual que vai quebrar coerência.

## Cores — uso com restrição

- **Amber (`brand.amber`)** — APENAS no logo, microfone gravando, border-left do histórico
  ativo, cor do equals em fundo escuro. NUNCA em botões genéricos.
- **Semantic colors** — apenas em badges de contexto (● Área verde, ● Comprimento azul).
  NUNCA como fundo de botão ou texto corrido.
- **Texto** — sempre use `color.text.primary/strong/secondary/tertiary`, nunca
  hexadecimal direto.

## Escalas tipográficas por dispositivo

Display principal (resultado do cálculo):

- Mobile: `typography.size['4xl']` (30px)
- Tablet: `typography.size['5xl']` (40px)
- Desktop: `typography.size['6xl']` (46px)

Unidade secundária (sq ft, sq in) sempre metade do tamanho do número:

- Mobile: 15px · Tablet: 20px · Desktop: 22px

## Transição padrão do pressure plate

A curva `cubic-bezier(0.34, 1.2, 0.64, 1)` é a assinatura tátil. Use em:

- `:hover` → `:active` de keycaps
- Micro-animações de botões
- Qualquer elemento que "apertaria"

NÃO use em:

- Aparições de modal (use `spring` ou `smooth`)
- Transições de página (use `smooth`)
- Loading states (use `standard`)

## Respeitar `prefers-reduced-motion`

Todos os componentes que usam `transition.base` devem ter fallback:

```css
@media (prefers-reduced-motion: reduce) {
  .keycap {
    transition: none;
  }
  .keycap:active {
    transform: none;
  }
}
```

## O que NÃO fazer

- ❌ Border 0.5px flat em botões → quebra a linguagem pressure plate
- ❌ Cor `#000` preto puro → use `color.text.primary` (#0F1419)
- ❌ Fundo branco `#FFFFFF` geral → use `color.surface.canvas` (#F4F2EC)
- ❌ Font weight 600+ → máximo é 500 (`typography.weight.medium`)
- ❌ Drop shadows sem inset highlight → sempre que tiver sombra externa, tenha
  highlight interno no topo pra manter a ilusão de volume
- ❌ Neumorphism exagerado → shadows devem ficar em 4-8% opacidade, nunca mais

## Dark mode

**Não implementado. E não entra neste refactor.**

O único contexto escuro que existe hoje é a **tela de gravação de voz**, e ela
usa o `charcoal gradient` (`gradient.darkScreen`, `color.charcoal.*`) aplicado
**inline no componente** — não há theme switch, a tela simplesmente assume
fundo escuro enquanto o usuário está gravando, e volta pro canvas bege quando
sai. Isso é intencional: a tela de voz é um *contexto modal focado*, não um
modo alternativo do app.

Dark mode full (toda a UI com paleta escura, alternável via setting ou
`prefers-color-scheme`) é **feature futura** fora do escopo da v2. Quando
chegar a hora:

1. Duplicar a paleta (`color.surface`, `color.text`) em variantes `dark`.
2. Emitir as duas como CSS vars num `[data-theme="dark"]` ou `@media (prefers-color-scheme: dark)`.
3. Auditar cada shadow — `inset` highlights brancos (90% alpha) não funcionam em fundo escuro; viram sombras invertidas.
4. Auditar semantic colors — os backgrounds com 85-90% de luminosidade ficam ilegíveis em tema escuro.

Antes disso: **ignorar `prefers-color-scheme`**. App é light-mode-first.

## Evolução

Quando adicionar um novo componente:

1. Decida qual das 3 categorias ele é (ACIONA, RECEBE, EMERGE)
2. Use os tokens existentes primeiro
3. Se precisar de um novo token, adicione em `tokens.ts` com nome semântico
4. Documente aqui

Nunca use valor hardcoded em componente. Se tá hardcoded, é sinal de que
falta um token.
