<!-- @ai-rules: Manter tabela de exports e "Usado Por" atualizados. -->

# @onsite/timeline

> Feed de eventos AI-mediated para canteiros de obra. Nao e chat direto — todas as mensagens passam por AI para tipagem/categorizacao.

## Exports

### Data Functions

| Export | Tipo | Descricao |
|--------|------|-----------|
| `fetchMessages(supabase, options)` | async function | Buscar mensagens da timeline |
| `sendMessage(supabase, input)` | async function | Enviar mensagem (AI media) |
| `subscribeToMessages(supabase, options, callback)` | function | Listener real-time |
| `fetchMessageCount(supabase, options)` | async function | Contar mensagens |
| `requestMediation(supabase, input)` | async function | Rodar analise AI |
| `groupMessagesByDate(messages)` | function | Agrupar por data |
| `formatMessageTime(date)` | function | Format HH:MM |
| `formatDateDivider(date)` | function | Format "Today", "Yesterday", etc. |

### Types

| Export | Tipo | Descricao |
|--------|------|-----------|
| `TimelineMessage` | interface | Mensagem do chat |
| `MessageAttachment` | interface | Fotos, docs, plantas |
| `SenderType` | type | `'worker' \| 'supervisor' \| 'operator' \| 'ai' \| 'system'` |
| `SourceApp` | type | `'monitor' \| 'timekeeper' \| 'operator'` |
| `TimelineEventType` | type | 11 tipos de evento |
| `AIMediationInput`, `AIMediationResult` | interface | AI input/output |

### Constants

| Export | Tipo | Descricao |
|--------|------|-----------|
| `PHASE_COLORS` | const Record | { bg, border, name } por fase |
| `SENDER_CONFIG` | const Record | Render config por sender |
| `EVENT_TYPE_CONFIG` | const Record | Icons, cores, labels por evento |

## Sub-exports

| Path | Conteudo |
|------|----------|
| `.` | Tudo (types + data + constants) |
| `./data` | Apenas funcoes de dados |
| `./constants` | Apenas constantes |

## Uso

```typescript
import { fetchMessages, sendMessage, subscribeToMessages } from '@onsite/timeline';
import { TimelineMessage, SenderType } from '@onsite/timeline';
import { PHASE_COLORS, EVENT_TYPE_CONFIG } from '@onsite/timeline';
```

## Usado Por

| App | Imports |
|-----|---------|
| Monitor | ChatTimeline (full UI) |
| Timekeeper | TimelineFeed no tab Timeline |
| Operator | Timeline em detalhes de pedido |
| Field | Timeline no lot detail |

## Cuidados

- **AI Mediation:** Texto do usuario passa por AI primeiro → vira evento tipado antes de salvar.
- **Duas tabelas:** `egl_messages` (chat raw) + `egl_timeline` (eventos estruturados).
- **Supabase como param:** Sem estado global — passar client em cada chamada.
- **Dep:** Apenas `@onsite/shared` + peer `@supabase/supabase-js`.
