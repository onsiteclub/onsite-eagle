<!--
  @ai-rules
  1. NUNCA delete entradas de "Historico de Evolucao" — apenas ADICIONE novas com data.
  2. NUNCA delete entradas de "Decisoes de Arquitetura" — apenas ADICIONE.
  3. Ao fazer mudancas significativas (features, refactors, migracoes),
     SEMPRE adicione uma entrada ao Historico de Evolucao.
  4. Mantenha a tabela Tech Stack atualizada — atualize versoes quando mudarem.
  5. Este arquivo descreve O QUE o app e e COMO evoluiu.
     Para build/deploy, veja PIPELINE.md.
-->

# OnSite Operator

> App mobile para operadores de campo gerenciarem entregas de materiais em canteiros de obra.

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | OnSite Operator |
| **Diretorio** | `apps/operator` |
| **Proposito** | Gerenciar entregas de materiais em tempo real. Operadores recebem pedidos urgentes, confirmam entrega com foto, e reportam incidentes diretamente na timeline do site. |
| **Audiencia** | Operadores de campo (motoristas, entregadores de material) |
| **Plataforma** | Android (iOS no roadmap) |
| **Bundle ID** | `com.onsiteclub.operator` |
| **Porta Dev** | 8081 (Metro) + `adb reverse tcp:8081 tcp:8081` |

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | Expo SDK | ~52.0.0 |
| React | React | 18.3.1 |
| React Native | RN | 0.76.0 |
| Navigation | Expo Router | ~4.0.0 |
| State | React state + Supabase Realtime | — |
| Database | Supabase JS | ^2.93.3 |
| Storage Session | AsyncStorage | 1.23.1 |
| Camera | expo-camera + expo-image-picker | ~16.0.0 / ~16.0.6 |
| Notifications | expo-notifications (FCM) | ~0.29.11 |
| Offline | @onsite/offline | * |

## 3. Telas / Rotas

```
app/
├── _layout.tsx              # Root Stack (auth guard, offline sync, push)
├── (auth)/
│   ├── _layout.tsx          # Auth group
│   └── login.tsx            # Email/password (operators pre-registrados)
├── (tabs)/
│   ├── _layout.tsx          # 3 tabs: Pedidos, Reportar, Config
│   ├── index.tsx            # Pedidos — cards realtime + FAB camera
│   ├── report.tsx           # Reportar — 4 botoes rapidos → timeline
│   └── config.tsx           # Config — toggle ON/OFF, QR, sign out
├── requests/
│   └── [id].tsx             # Detalhe do pedido
├── deliver/
│   └── [id].tsx             # Confirmar entrega + foto + timeline
├── photo.tsx                # Foto avulsa (7 categorias + lote)
└── scanner.tsx              # QR scanner → vincular a site
```

### Fluxos Principais

| Fluxo | Caminho | Descricao |
|-------|---------|-----------|
| Entrega com foto | Pedidos → [Entregue] → deliver/[id] → foto → upload → timeline | Confirma entrega com prova fotografica |
| Foto avulsa | Pedidos → FAB → photo.tsx → classificar → upload → timeline | Reporta situacao do campo (acidente, bloqueio, etc.) |
| Report rapido | Reportar → botao → timeline | Gasolina, pneu, maquina, outro |
| Vincular site | Config → QR → scanner.tsx → joinSite | Conecta operator a um canteiro |

## 4. Packages Internos

| Package | Imports Principais | Proposito |
|---------|-------------------|-----------|
| `@onsite/shared` | `MaterialRequest`, `getOperatorQueue`, `updateRequestStatus` | Types e queries de material requests |
| `@onsite/timeline` | `sendMessage` | Posta eventos na timeline do site/lote |
| `@onsite/offline` | `initQueue`, `useOfflineSync` | Queue offline para sync |
| `@onsite/sharing` | `parseQRPayload`, `joinSite` | QR code para vincular a site |
| `@onsite/camera` | `uploadPhoto`, `uploadPhotoFromUri` | Pipeline upload fotos (Storage + DB + timeline) |
| `@onsite/auth` | — | Auth context (via supabase.ts interno) |
| `@onsite/auth-ui` | — | Componentes de login |
| `@onsite/tokens` | — | Design tokens (cores, espacamento) |

## 5. Fluxo de Dados

### Tabelas Supabase (leitura)

| Tabela | Uso |
|--------|-----|
| `egl_material_requests` | Lista de pedidos de materiais (realtime subscription) |
| `egl_sites` | Info do canteiro vinculado |
| `egl_houses` | Lotes do canteiro (para foto avulsa) |
| `core_profiles` | Perfil do operador |

### Tabelas Supabase (escrita)

| Tabela | Uso |
|--------|-----|
| `egl_material_requests` | Atualizar status (acknowledged → in_transit → delivered) |
| `egl_timeline` | Postar eventos (entregas, fotos, reports) |
| `core_devices` | Registrar push token |

### Storage

| Bucket | Path | Uso |
|--------|------|-----|
| `egl-media` | `{siteId}/{houseId}/{timestamp}_{random}.jpg` | Fotos de entregas e campo |

### Conexao com Outros Apps

```
Monitor (supervisor) ──[cria pedido]──→ egl_material_requests ──[realtime]──→ Operator
Operator ──[confirma entrega + foto]──→ egl_timeline ──[aparece em]──→ Monitor + Field
```

## 6. Decisoes de Arquitetura

1. **2026-02-25: 5 tabs → 3 tabs** — Simplificacao radical. 95% do tempo do operador e na tela de Pedidos. Tabs "Mapa" e "Historico" removidas. Report virou tab dedicada com 4 botoes rapidos.

2. **2026-02-25: Auth sem signup** — Operadores sao pre-registrados pelo supervisor no Monitor. Login e apenas email/password. Sem fluxo de cadastro.

3. **2026-02-25: Realtime via Supabase channels** — Material requests usam `postgres_changes` para atualizar em tempo real. Badge "Live" no header confirma conexao.

4. **2026-02-25: Foto na entrega e opcional** — Entrega pode ser confirmada sem foto. Foto adiciona prova mas nao bloqueia o fluxo.

5. **2026-02-25: Foto avulsa com 7 categorias** — Classificacao padronizada (Entrega, Acidente, Bloqueio, Roubo, Dano, Progresso, Outro) + selecao de lote + comentario opcional.

6. **2026-02-25: newArchEnabled: false** — New Architecture causa crashes com expo-notifications. Manter desabilitado ate estabilizar.

7. **2026-02-25: watchFolders especificos** — Apenas packages/@onsite/* usados. NUNCA monorepoRoot (trava Metro no Windows escaneando .next/.turbo/etc).

## 7. Historico de Evolucao

### 2026-02-25 — v2: Redesign Completo (3 Tabs)
- Simplificado de 5 tabs para 3 (Pedidos, Reportar, Config)
- Primeiro build funcional no Samsung SM_G990W
- Auth flow com guard e redirect automatico
- Realtime material requests com Supabase channels
- Foto na entrega + foto avulsa com classificacao
- 12 erros de build encontrados e resolvidos (documentados no PIPELINE.md)
- Integracao com @onsite/camera, @onsite/sharing, @onsite/offline
- AI Mediator fix no Monitor (material_request pipeline)
