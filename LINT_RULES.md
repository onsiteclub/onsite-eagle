# Lint & Formatting Rules — OnSite Eagle

> Documento de referencia para regras de lint e formatacao do monorepo.
> Atualizado: 2026-02-27

---

## Resumo Rapido

| Ferramenta | Versao | Escopo | Comando |
|------------|--------|--------|---------|
| **Prettier** | ^3.4.0 | Todo o monorepo | `npm run format:check` / `npm run format` |
| **ESLint** | ^9.0.0 | Cada app/package individual | `npm run lint` / `npx turbo lint` |

---

## 1. Prettier (Formatacao)

Config: [.prettierrc](.prettierrc)

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "auto"
}
```

### O que cada regra faz

| Regra | Valor | Significado |
|-------|-------|-------------|
| `semi` | `true` | Ponto-e-virgula no final de statements |
| `singleQuote` | `true` | Aspas simples (`'hello'` em vez de `"hello"`) |
| `tabWidth` | `2` | Indentacao de 2 espacos |
| `trailingComma` | `"es5"` | Virgula no ultimo item de arrays/objects (padrao ES5) |
| `printWidth` | `100` | Quebra linha em 100 caracteres |
| `arrowParens` | `"always"` | Arrow functions sempre com parenteses: `(x) => x` |
| `endOfLine` | `"auto"` | Respeita o OS (CRLF no Windows, LF no Linux/CI) |

### Arquivos ignorados

Config: [.prettierignore](.prettierignore)

```
node_modules/, .next/, dist/, build/, coverage/,
android/, ios/, *.lock, .turbo/, .expo/
```

### Como usar

```bash
# Verificar (nao altera arquivos)
npm run format:check

# Corrigir automaticamente
npm run format
```

---

## 2. ESLint (Qualidade de Codigo)

ESLint 9 com **flat config** (novo formato). Tres templates diferentes conforme o tipo de projeto:

### Template A: Packages (18 packages)

Arquivo: `packages/*/eslint.config.mjs`

```javascript
// Extends: js.configs.recommended + tseslint.configs.recommended
// Regras custom:
'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
'@typescript-eslint/no-explicit-any': 'warn'
```

**Regras ativas (via recommended):**
- `no-undef` — Variavel nao declarada
- `no-useless-escape` — Escape desnecessario em regex/string
- `no-constant-condition` — `if (true)` etc
- `no-empty` — Blocos vazios
- `@typescript-eslint/no-unused-vars` — **warn** (nao erro), ignora `_prefixados`
- `@typescript-eslint/no-explicit-any` — **warn** (nao erro)
- Mais ~40 regras do `recommended` (erros logicos, syntax)

### Template B: Apps Expo (4 apps: field, inspect, operator, timekeeper)

Arquivo: `apps/*/eslint.config.js`

```javascript
// Extends: js.configs.recommended + tseslint.configs.recommended
// Plugins: react-hooks
// Regras custom:
...reactHooks.configs.recommended.rules  // rules-of-hooks + exhaustive-deps
'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
'@typescript-eslint/no-explicit-any': 'warn'
```

**Regras adicionais (via react-hooks):**
- `react-hooks/rules-of-hooks` — **error** — Hooks so no top-level
- `react-hooks/exhaustive-deps` — **warn** — Dependencies de useEffect/useMemo/useCallback

### Template C: Apps Next.js (4 apps: monitor, analytics, dashboard, auth)

Arquivo: `apps/*/eslint.config.mjs`

```javascript
// Extends: eslint-config-next/core-web-vitals + eslint-config-next/typescript
```

**Regras incluidas (via next):**
- Todas do Template A (recommended)
- `react-hooks/rules-of-hooks` + `exhaustive-deps`
- `@next/next/no-html-link-for-pages` — Usar `<Link>` do Next.js
- `@next/next/no-img-element` — Usar `<Image>` do Next.js
- Core Web Vitals rules (performance)
- Import/export validation

### Como usar

```bash
# Lint de um package/app especifico
cd packages/shared && npx eslint .

# Lint via turbo (todos)
npx turbo lint

# Lint de apps especificos
npx turbo lint --filter=@onsite/monitor
npx turbo lint --filter=@onsite/shared
```

---

## 3. Nivel de Severidade Atual

A configuracao atual e **conservadora** (pouco barulhenta):

| Categoria | Severidade | Justificativa |
|-----------|------------|---------------|
| Erros logicos (recommended) | `error` | Bugs reais — devem ser corrigidos |
| Hooks rules | `error` | Viola regras fundamentais do React |
| Hooks exhaustive-deps | `warn` | Importante mas tem falsos positivos |
| Variaveis nao usadas | `warn` | Cleanup progressivo, nao bloqueia |
| `any` explicito | `warn` | Migrar gradualmente, nao bloqueia |
| Formatacao | Prettier (separado) | Prettier cuida, ESLint nao interfere |

### O que NAO esta ativo (e por que)

| Regra | Por que desligada | Quando ligar |
|-------|-------------------|--------------|
| `no-console` | 143 console.log ja migrados para @onsite/logger, mas novos podem aparecer | Quando quiser prevenir novos console.log |
| `@typescript-eslint/strict-type-checked` | Muito barulhento pra codebase existente | Quando TypeScript estiver limpo |
| `@typescript-eslint/no-floating-promises` | Exige `await` ou `.catch()` em toda Promise | Quando tiver padrao de error handling |
| `import/order` | Precisa plugin extra (`eslint-plugin-import`) | Quando quiser organizar imports |
| `react/prop-types` | Usa TypeScript, nao precisa PropTypes | Nunca (TypeScript resolve) |

---

## 4. CI/CD Integration

Arquivo: [.github/workflows/ci.yml](.github/workflows/ci.yml)

| Check | Bloqueia PR? | Comando |
|-------|-------------|---------|
| Prettier | Nao | `npx prettier --check .` |
| Lint packages | Nao | `npx turbo lint --filter=./packages/*` |
| Lint apps | Nao | `npx turbo lint --filter=./apps/*` |
| Typecheck packages | **Sim** | `tsc --noEmit` em cada package |
| Typecheck web apps | **Sim** | `tsc --noEmit` em monitor/analytics/dashboard/auth |
| Typecheck Expo apps | Nao (informacional) | `tsc --noEmit` em field/inspect/operator/timekeeper |

> **Nota:** Lint e Prettier estao como non-blocking por agora para nao bloquear PRs
> enquanto o codebase existente ainda tem warnings. Quando estiver limpo,
> mudar para blocking.

---

## 5. Estado Atual (Snapshot 2026-02-27)

### Prettier
- ~11 arquivos com formatacao diferente so no `packages/shared` (estimativa: 100+ no monorepo inteiro)
- Correcao: `npm run format` (automatico, seguro)

### ESLint
- `@onsite/shared`: 2 errors (useless escape), 1 warning (unused var)
- `@onsite/utils`: 2 warnings (explicit any)
- `@onsite/auth`: limpo (0 problemas)
- Apps: nao auditados individualmente ainda

### Para limpar tudo de uma vez
```bash
# 1. Formatacao (automatico)
npm run format

# 2. Ver todos os warnings/errors de lint
npx turbo lint 2>&1 | grep -E "(error|warning|✖)"

# 3. Fix automatico do ESLint (quando possivel)
cd packages/shared && npx eslint . --fix
```

---

## 6. Historico de Mudancas

| Data | Mudanca | Motivo |
|------|---------|--------|
| 2026-02-27 | Setup inicial: Prettier + ESLint 9 flat config | Padronizar formatacao e qualidade |
| 2026-02-27 | 3 templates ESLint (packages, Expo, Next.js) | Cada tipo de projeto tem necessidades diferentes |
| 2026-02-27 | Regras conservadoras (warn, nao error) | Nao bloquear desenvolvimento durante limpeza |
| 2026-02-27 | CI non-blocking para lint/format | Visibilidade sem bloqueio |

---

## 7. Proximas Evolucoes Sugeridas

Quando quiser apertar as regras, sugestoes em ordem de prioridade:

1. **`npm run format`** — Rodar uma vez para limpar toda formatacao existente
2. **`no-console: warn`** — Prevenir novos console.log (ja migramos 143)
3. **Lint blocking no CI** — Depois que warnings existentes forem resolvidos
4. **`eslint-plugin-import`** — Ordenacao e validacao de imports
5. **`strict-type-checked`** — Regras TypeScript mais rigorosas (mais trabalhoso)
