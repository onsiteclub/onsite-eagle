<!-- @ai-rules: Manter tabela de exports e "Usado Por" atualizados. -->

# @onsite/shared

> Single source of truth para types e constantes do ecossistema OnSite Club.

## Exports

| Export | Tipo | Descricao |
|--------|------|-----------|
| `Site`, `SiteContact`, `SiteDocument`, `SiteRule`, `SiteDate` | interface | Tipos de site de construcao |
| `House`, `HouseStatus`, `SiteWorker` | interface/type | Lotes e workers |
| `Phase`, `PhaseItem`, `Progress` | interface | Fases de construcao e progresso |
| `Organization`, `OrgMembership`, `OrgRole` | interface/type | Multi-tenancy |
| `BillingPlan`, `PricingTier` | interface | Billing por sqft |
| `CopilotContext`, `CopilotRequest`, `CopilotResponse` | interface | AI Copilot types |
| `PhotoAnalysisResult`, `DocumentExtractionResult` | interface | AI outputs |
| `IssueSuggestion`, `ChecklistItem`, `TimelineSuggestion` | interface | AI suggestions |
| `HOUSE_STATUSES`, `PHASE_ORDER`, `PHASE_NAMES` | const | Constantes de fases |
| `getHouseStatusLabel()`, `parseStorageFilename()` | function | Helpers |

## Uso

```typescript
import { Site, House, HouseStatus, Phase } from '@onsite/shared';
import { CopilotRequest, CopilotResponse } from '@onsite/shared';
```

## Usado Por

| App/Package | Imports Principais |
|-------------|-------------------|
| Todos os 9 apps | Types de database |
| @onsite/auth | User types |
| @onsite/timeline | Event types |
| @onsite/ui | Theme types |

## Cuidados

- **Zero runtime deps** — Apenas TypeScript. Seguro para circular dependencies.
- **Sem subpath exports** — Tudo via root `@onsite/shared`.
- **Manter em sync com Supabase schema** — Types devem refletir tabelas reais.
- `HouseStatus` = `'not_started' | 'in_progress' | 'delayed' | 'completed' | 'on_hold'`
