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

# OnSite Calculator

> Calculadora de construcao com matematica imperial (pes, polegadas, fracoes) e input por voz multilingual.

## 1. Identidade

| Campo | Valor |
|-------|-------|
| **Nome** | OnSite Calculator |
| **Diretorio** | `apps/calculator` |
| **Proposito** | Calculadora especializada para construcao civil. Suporta fracoes imperiais (1/2, 1/4, 1/8, 1/16), conversao de unidades, calculo de escadas, triangulos. Voice input via Whisper + GPT-4o permite falar medidas em ingles ou portugues. |
| **Audiencia** | Trabalhadores de construcao (todas as funcoes) |
| **Plataforma** | Web + Android + iOS |
| **Porta Dev** | 5173 (Vite) |
| **URL Producao** | `calculator.onsiteclub.ca` / `calc.onsiteclub.ca` |

## 2. Tech Stack

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Framework | Vite | 5.4.0 |
| React | React | 18.3.1 |
| Mobile Bridge | Capacitor | 6.1.0 |
| Styling | TailwindCSS | 3.4.1 |
| Database | Supabase JS | 2.49.0 |
| Voice AI | OpenAI (Whisper + GPT-4o) | Via Vercel serverless |
| Testing | Vitest | 2.0.0 |
| CI/CD | Codemagic | 4 workflows |
| Deploy (web) | Vercel | Auto-deploy |

## 3. Telas / Rotas

O app e SPA (Single Page Application) com tabs internas:

| Tab | Componente | Descricao |
|-----|-----------|-----------|
| **Calculator** | `Calculator.tsx` | Calculadora principal com voice input, historico, fracoes imperiais |
| **Stairs** | `StairsCalculator.tsx` | Calculo de escadas (rise, run, stringers) |
| **Triangle** | `TriangleCalculator.tsx` | Resolver triangulos (lados, angulos) |
| **Converter** | `UnitConverter.tsx` | Conversao imperial ↔ metrico |

### Componentes Overlay

| Componente | Trigger | Descricao |
|-----------|---------|-----------|
| `AuthGate.tsx` | Tentar usar voice sem login | Modal login/signup frictionless |
| `VoiceConsentModal.tsx` | Primeiro uso de voice | Consent LGPD obrigatorio |
| `HistoryModal.tsx` | Menu → History | Calculos salvos |
| `HamburgerMenu.tsx` | Icone menu | Settings, legal, about |

### API Route (Vercel Serverless)

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/interpret` | POST | Recebe audio WebM → Whisper transcreve → GPT-4o extrai expressao → retorna resultado |

## 4. Packages Internos

| Package | Imports | Proposito |
|---------|---------|-----------|
| `@onsite/auth` | `AuthProvider`, `useAuth` | Auth context (freemium: funciona anonimo) |
| `@onsite/auth-ui` | Auth components | Modals de login/signup |
| `@onsite/logger` | Structured logging | Logs de calculo e voz |
| `@onsite/tokens` | Design tokens | Cores, espacamento |
| `@onsite/utils` | Formatters | Sub-exports apenas (evitar tailwind-merge) |

## 5. Fluxo de Dados

### Voice Input Pipeline

```
Usuario fala → WebM audio → POST /api/interpret
  → Whisper (transcricao) → GPT-4o (extrai expressao)
  → Sanitize (3 camadas: prompt + client regex + server regex)
  → Calculator engine (PEMDAS) → Resultado
```

### Tabelas Supabase (leitura/escrita)

| Tabela | Uso |
|--------|-----|
| `ccl_calculations` | Historico de calculos (tipo, input, resultado, metodo) |
| `ccl_templates` | Templates de formulas (sistema + usuario) |
| `core_voice_logs` | Logs de voice input (audio, transcricao, confidence, intent) |
| `core_profiles` | Perfil do usuario |
| `core_consents` | Consentimento de voz e dados |

### Modelo Freemium

| Feature | Anonimo | Logado |
|---------|---------|--------|
| Calculadora basica | Sim | Sim |
| Fracoes imperiais | Sim | Sim |
| Voice input | **Nao** | Sim (com consent) |
| Historico | **Nao** | Sim |
| Escadas / Triangulo | Sim | Sim |
| Converter | Sim | Sim |

### CORS Origins

Producao: `calculator.onsiteclub.ca`, `calc.onsiteclub.ca`, `app.onsiteclub.ca`
Capacitor: `capacitor://localhost`
Dev: `localhost:5173`

### Rate Limit

30 requests/minuto por IP no endpoint `/api/interpret`.

## 6. Decisoes de Arquitetura

1. **Pre-2026: Vite + Capacitor (nao Expo)** — Calculator e web-first (PWA), com bridge nativo via Capacitor. Expo seria overkill para uma SPA sem navegacao nativa complexa.

2. **Pre-2026: React 18.3.1 (nao 19)** — Capacitor exige React 18. Consistente com apps Expo.

3. **Pre-2026: Freemium (anon funciona)** — Calculadora basica funciona sem login. Voice e historico exigem conta. Reduz friccao de adocao.

4. **Pre-2026: Voice via Vercel Serverless** — `api/interpret.ts` roda como serverless function no Vercel. OpenAI key fica server-side. Client so envia audio.

5. **Pre-2026: 3 camadas de sanitize para percentagem** — GPT converte `10%` para `10/100` incorretamente. Fix: SYSTEM_PROMPT + client regex + server regex.

6. **Pre-2026: CapacitorHttp disabled** — Bug do Capacitor HTTP nativo remove query params. Desabilitado para usar fetch nativo do WebView.

7. **2026-01-15: Dark → Light theme (v3.2)** — Redesign para dashboard minimalista. Background `#F6F8FB`, cards `#FFFFFF`, accent teal `#0F3D3A`.

8. **Pre-2026: Delete/Export removidos do menu** — Funcoes de deletar conta e exportar dados removidas do HamburgerMenu. Regressao resolvida no versionCode 11.

## 7. Historico de Evolucao

### Pre-2026 — v3.0: Fundacao
- Calculadora imperial com fracoes (1/2, 1/4, 1/8, 1/16)
- Voice input via Whisper + GPT-4o
- Capacitor para Android + iOS
- Codemagic CI/CD (4 workflows)
- Freemium model (anon + logado)
- StairsCalculator, TriangleCalculator, UnitConverter

### 2026-01-15 — v3.2: UI Redesign & Branding
- Theme: Dark → Light (minimalista dashboard style)
- Cores: App `#F6F8FB`, Cards `#FFFFFF`, Accent `#0F3D3A`
- Header simplificado (logo + user badge + offline badge)
- Bug fixes: 3 infinite loops (useAuth, useDeepLink, refreshProfile)
- Loop prevention com useRef
- Arquivos: App.css, Calculator.tsx, HamburgerMenu.tsx
