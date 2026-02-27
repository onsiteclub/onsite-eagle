<!-- @ai-rules: Manter tabela de exports e "Usado Por" atualizados. CRITICO: notar regra de sub-exports para mobile. -->

# @onsite/utils

> Funcoes utilitarias: formatacao, auth helpers, CSS class merging, file export.

## Exports

### Formatting

| Export | Descricao | Exemplo |
|--------|-----------|---------|
| `formatDate(date, format?)` | Data formatada | "Jan 1, 2026" |
| `formatDateTime(date)` | Data + hora | "Jan 1, 2026, 2:30 PM" |
| `formatRelative(date)` | Relativo | "Just now", "5m ago", "2d ago" |
| `formatDuration(ms)` | Duracao | "2h 30m" |
| `formatNumber(num, decimals?)` | Numero | "1,234.56" |
| `formatPercent(num, decimals?)` | Percentual | "45.3%" |
| `formatCurrency(amount, currency?)` | Moeda | "$1,234.56" |
| `truncate(text, maxLen?)` | Truncar texto | "Hello wo..." |
| `getInitials(fullName)` | Iniciais | "JD" |
| `capitalize(text)` | Capitalizar | "Hello" |

### CSS

| Export | Descricao |
|--------|-----------|
| `cn(...classes)` | Merge classes Tailwind (deduplica) |

### Auth Helpers

| Export | Descricao |
|--------|-----------|
| `isValidRedirectUrl(url)` | Validar redirect Supabase |
| `getRedirectUrl(req)` | Extrair redirect da request |
| `buildCallbackUrl(origin, path)` | Construir OAuth callback |
| `formatAuthError(error)` | Mensagem amigavel de erro |
| `isValidEmail(email)` | Validar email |
| `validatePassword(pwd)` | Check forca (`{ valid, errors }`) |

### File Export

| Export | Descricao |
|--------|-----------|
| `toCSV(data)` | Array → CSV string |
| `downloadFile(content, filename, type)` | Download no browser |
| `downloadCSV(data, filename)` | Export como CSV |

## Sub-exports

| Path | Conteudo | Mobile-safe? |
|------|----------|-------------|
| `.` | Tudo (cn + format + auth + export) | **NAO** (puxa tailwind-merge) |
| `./cn` | Apenas `cn()` | **NAO** (tailwind-merge) |
| `./format` | Apenas formatters | **SIM** |
| `./auth` | Apenas auth helpers | **SIM** (mas usa process.env Next.js) |
| `./export` | Apenas file export | **SIM** (mas usa browser APIs) |

## Uso

```typescript
// Web apps (Next.js) — root import OK
import { cn, formatDate, downloadCSV } from '@onsite/utils';

// Mobile apps (Expo) — USAR SUB-EXPORTS
import { formatDate, formatRelative } from '@onsite/utils/format';
// NUNCA: import { formatDate } from '@onsite/utils';  ← puxa tailwind-merge!
```

## Usado Por

| App | Imports | Via |
|-----|---------|-----|
| Monitor | cn, formatters, export | Root `.` |
| Analytics | cn, formatters, export | Root `.` |
| Dashboard | cn, auth helpers | Root `.` |
| Field | formatDate, formatRelative | `./format` |
| Operator | formatDate | `./format` |
| Timekeeper | formatDate, formatDuration | `./format` |

## Cuidados

- **CRITICO para mobile:** Root export (`.`) re-exporta `cn()` que depende de `tailwind-merge` (web-only). Apps Expo DEVEM usar sub-exports (`./format`, `./auth`).
- **Deps:** `clsx ^2.1.0` + `tailwind-merge ^2.2.0` (ambas web-only).
- `validatePassword()` retorna `{ valid: boolean, errors: string[] }`, nao boolean.
- `getRedirectUrl()` le `process.env.NEXT_PUBLIC_SITE_URL` — Next.js only.
