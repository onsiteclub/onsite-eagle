<!-- @ai-rules: Manter tabela de exports e "Usado Por" atualizados. -->

# @onsite/ui

> Componentes React compartilhados + sistema de tema unificado para web e React Native.

## Exports

### Theme

| Export | Tipo | Descricao |
|--------|------|-----------|
| `colors`, `lightTheme`, `darkTheme` | const | Paletas de cores |
| `typography`, `textStyles` | const | Fontes, tamanhos, pesos |
| `spacing`, `borderRadius`, `shadows` | const | Layout |
| `theme`, `dashboardTheme`, `fieldTheme` | const | Temas completos |
| `lotIcons`, `lotIconLabels` | const | Icones de lotes |

### Web Components

| Export | Tipo | Descricao |
|--------|------|-----------|
| `QRCode` | component | QR code (via qrcode.react) |
| `Calendar` | component | Calendario de eventos |

### Native Components

| Export | Tipo | Descricao |
|--------|------|-----------|
| `Calendar` | component | Calendario nativo |
| `SpineTimeline` | component | Timeline vertical de fases |
| `ProgressBar`, `ProgressBarCompact` | component | Barras de progresso |
| `LotCard` | component | Card de lote |
| `UserBadge`, `UserBadgeInline` | component | Badge de usuario |
| `QRCode` | component | QR code (via react-native-qrcode-svg) |
| `QRScanner` | component | Scanner de QR code |

### Cross-Platform

| Export | Tipo | Descricao |
|--------|------|-----------|
| `Button` | component | Botao cross-platform |
| `AnimatedRing` | component | Indicador de loading |

## Sub-exports

| Path | Conteudo | Notas |
|------|----------|-------|
| `.` | Theme + types | Seguro para todos |
| `./theme` | Apenas tema (cores, tipografia, spacing) | Sem componentes |
| `./web` | QRCode, Calendar (web) | Requer react-dom |
| `./native` | 8 componentes nativos | Requer react-native |

## Uso

```typescript
// Theme (qualquer plataforma)
import { theme, colors } from '@onsite/ui/theme';

// Web
import { QRCode, Calendar } from '@onsite/ui/web';

// Native
import { LotCard, ProgressBar, Calendar } from '@onsite/ui/native';
```

## Usado Por

| App | Imports |
|-----|---------|
| Monitor | theme, web components |
| Field | LotCard, ProgressBar, QRScanner |
| Inspect | QRCode, Calendar |
| Operator | native components |
| Timekeeper | theme, Calendar |
| Dashboard | theme |

## Cuidados

- **Platform split:** Web e Native tem implementacoes DIFERENTES de QRCode e Calendar.
- **Theme variants:** `fieldTheme` (dark) para Expo, `dashboardTheme` (light) para web admin.
- **Deps:** `qrcode.react` (web), `react-native-qrcode-svg` + `react-native-svg` (native).
