# OnSite Club — Dashboard / Area de Membros

> **Spec Funcional v1.0** — 2026-02-25
> Status: DRAFT — Aguardando aprovacao do fundador

---

## 1. VISAO

O Dashboard NAO e so uma "area de configuracoes". E a **sede digital do OnSite Club** —
o lugar onde o trabalhador sente que pertence a algo maior que um app de ponto.

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   "Costco para trabalhadores de construcao"                     ║
║                                                                  ║
║   Paga a membresia → recebe valor em TUDO:                      ║
║   ferramentas, desconto, reconhecimento, comunidade             ║
║                                                                  ║
║   Taxa de renovacao alvo: >85% (Costco: 92.9%)                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Por que "Club" e nao "Dashboard"

| Termo | Sensacao | Exemplo |
|-------|----------|---------|
| Dashboard | Ferramenta, trabalho, obrigacao | "Abrir o dashboard pra ver minhas horas" |
| Member Area | Burocratico, bancario | "Acessar minha area de membro" |
| **Club** | Pertencimento, exclusividade, orgulho | "Sou do OnSite Club" |

O nome interno continua `apps/dashboard` mas a experiencia e **OnSite Club Hub**.

---

## 2. PUBLICO E PERSONAS

### 2.1 Persona Primaria: Worker (80% dos usuarios)

```
Nome: Carlos
Trade: Framer (carpinteiro de estrutura)
Origem: Brasileiro, 5 anos no Canada
Idioma: Portugues (primario), Ingles (trabalho)
Device: Android mid-range, plano de dados limitado
Motivacao: "Quero saber minhas horas, ser reconhecido, economizar em ferramentas"
Frustracao: "Tenho 5 apps diferentes, nenhum fala portugues"
```

### 2.2 Persona Secundaria: Supervisor/Foreman (15%)

```
Nome: Mike
Trade: General Contractor
Origem: Canadense, 20 anos de experiencia
Idioma: Ingles
Device: iPhone + laptop
Motivacao: "Preciso ver o progresso dos meus sites e equipes"
Frustracao: "Excel funciona mas nao escala"
```

### 2.3 Persona Terciaria: Inspector/Admin (5%)

```
Nome: Sarah
Role: City Inspector / QA
Motivacao: "Preciso aprovar fases rapidamente"
```

---

## 3. ARQUITETURA DE PAGINAS

```
onsite-club.ca/
│
├── /                           ← Landing (login/signup)
├── /auth/callback              ← OAuth/magic link
├── /reset-password             ← Recuperar senha
│
├── /club/                      ← HUB PRINCIPAL (pos-login)
│   ├── /club/apps              ← Meus Apps (cards interativos)
│   ├── /club/stats             ← Minhas Estatisticas
│   ├── /club/card              ← Meu Cartao Digital
│   ├── /club/badges            ← Minhas Conquistas
│   ├── /club/rewards           ← Blades + Descontos
│   ├── /club/news              ← Novidades & Campanhas
│   └── /club/community         ← Comunidade (futuro)
│
├── /account/                   ← CONTA (configuracoes)
│   ├── /account/profile        ← Editar perfil
│   ├── /account/subscription   ← Plano & Pagamento
│   ├── /account/devices        ← Dispositivos
│   ├── /account/privacy        ← Privacidade & Dados
│   └── /account/security       ← Seguranca
│
├── /app/                       ← DASHBOARDS POR APP
│   ├── /app/timekeeper         ← Dashboard Timekeeper
│   ├── /app/calculator         ← Dashboard Calculator
│   ├── /app/eagle              ← Dashboard Eagle
│   ├── /app/field              ← Dashboard Field
│   ├── /app/operator           ← Dashboard Operator
│   ├── /app/inspect            ← Dashboard Inspect
│   └── /app/shop               ← Dashboard Shop
│
├── /legal/                     ← PAGINAS PUBLICAS
│   ├── /legal/terms
│   ├── /legal/privacy
│   ├── /legal/security
│   └── /legal/cancellation
│
└── /admin/                     ← ADMIN (super_admin only)
    ├── /admin/users
    ├── /admin/analytics
    └── /admin/campaigns
```

---

## 4. PAGINAS DETALHADAS

### 4.1 `/club/` — Hub Principal

A primeira tela apos login. Deve entregar valor em **5 segundos**.

```
┌─────────────────────────────────────────────────────────────────┐
│  OnSite Club                              [Avatar] Carlos ▼    │
│  "Wear what you do!"                       Framer | Pro Member │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Bom dia, Carlos!                          Membro desde Jan/26  │
│  Streak: 12 dias consecutivos                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ESTA SEMANA                                             │    │
│  │                                                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │  │  40.5h   │  │  12      │  │  8       │              │    │
│  │  │  horas   │  │  fotos   │  │  calculos│              │    │
│  │  │ trabalhad│  │ enviadas │  │ feitos   │              │    │
│  │  └──────────┘  └──────────┘  └──────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  NOVIDADES DO CLUB                                       │    │
│  │                                                          │    │
│  │  [CAMPAIGN] Winter Gear Sale — 25% off para membros Pro  │    │
│  │  [BADGE] Voce desbloqueou "Winter Warrior"!              │    │
│  │  [NEWS] Ontario: novo salario minimo em Abril            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MEUS APPS                                               │    │
│  │                                                          │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │    │
│  │  │Timekeeper│ │Calculat.│ │  Eagle  │ │  Shop   │      │    │
│  │  │ 40.5h   │ │ 8 calc  │ │ 3 sites │ │ 2 orders│      │    │
│  │  │esta sem. │ │esta sem.│ │ ativos  │ │pendentes│      │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │    │
│  │                                                          │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │    │
│  │  │  Field  │ │Operator │ │ Inspect │                   │    │
│  │  │ 12 fotos│ │ 5 pedid.│ │ 3 aprov.│                   │    │
│  │  │enviadas │ │complet. │ │pendentes│                   │    │
│  │  └─────────┘ └─────────┘ └─────────┘                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ATIVIDADE RECENTE                                       │    │
│  │                                                          │    │
│  │  * Foto aprovada: Lote 5, Frame completo                │    │
│  │  * Horas sincronizadas (40.5h esta semana)              │    │
│  │  * Material entregue: Trusses - Maple Ridge             │    │
│  │  * Badge desbloqueado: "Early Bird" (7h por 5 dias)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Regras do Hub:**
- Mostra APENAS apps que o usuario realmente usa (tem dados)
- Cards de apps sao clicaveis → levam ao dashboard do app
- Campanhas e novidades sao curadas por admin
- Stats sao agregadas de TODOS os apps
- Saudacao usa `preferred_name` ou `first_name`
- Streak conta dias consecutivos com qualquer atividade (login, clock-in, foto, calculo)

### 4.2 `/club/card` — Cartao Digital do Trabalhador

O **anchor de identidade** do Club. O trabalhador pode mostrar pro chefe, pro colega,
na entrevista de emprego. E o "cartao de visita profissional" da construcao.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                          │   │
│   │   [FOTO]   CARLOS OLIVEIRA DA SILVA                     │   │
│   │             Framer | Journeyman                          │   │
│   │                                                          │   │
│   │   OSC-12847                                              │   │
│   │   Member since January 2026                              │   │
│   │   Ontario, Canada                                        │   │
│   │                                                          │   │
│   │   ┌────────────────────────────────┐                     │   │
│   │   │ Total Hours    │    2,847h     │                     │   │
│   │   │ Sites Worked   │    12         │                     │   │
│   │   │ Photos Taken   │    456        │                     │   │
│   │   │ Experience     │    5 years    │                     │   │
│   │   └────────────────────────────────┘                     │   │
│   │                                                          │   │
│   │   Badges: [Master Framer] [Winter Warrior] [Early Bird]  │   │
│   │                                                          │   │
│   │           [QR CODE]                                      │   │
│   │                                                          │   │
│   │   ──── OnSite Club | Pro Member ────                     │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   [Compartilhar]  [Baixar PDF]  [Adicionar ao Wallet]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Dados do cartao:**
- Foto: `core_profiles.avatar_url`
- Nome: `core_profiles.full_name`
- Trade: `ref_trades.name_{lang}` + experience level (calculado)
- Codigo: `core_profiles.worker_code` (OSC-XXXXX)
- Membro desde: `core_profiles.created_at`
- Provincia: `core_profiles.province`
- Stats: agregadas de `tmk_entries`, `egl_photos`, etc.
- Badges: `club_user_badges` (nova tabela)
- QR Code: link para perfil publico (opt-in) ou verificacao de membresia

**Niveis de experiencia (calculados):**

| Nivel | Criterio | Badge Visual |
|-------|----------|-------------|
| Apprentice | < 2000h OU < 2 anos | Verde |
| Journeyman | 2000-5000h E 2-5 anos | Azul |
| Master | > 5000h E > 5 anos | Dourado |
| Red Seal | Certificacao confirmada | Vermelho + selo |

> Nota: Niveis sao INFORMATIVOS, nao substituem certificacao real.
> Baseados em `total_hours_tracked` + `experience_years` + badges.

### 4.3 `/club/apps` — Meus Apps

Grid de todos os apps do ecossistema. Cada card mostra:
- Icone e nome do app
- Mini-stat relevante (ultimo uso, dados recentes)
- Status: Ativo / Disponivel / Em Breve
- Badge de desconto se houver campanha

```
┌─────────────────────────────────────────────────────────────────┐
│  MEUS APPS                                                      │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  TIMEKEEPER     │  │  CALCULATOR     │  │  EAGLE          │ │
│  │  Controle de    │  │  Calculadora    │  │  Inspecao       │ │
│  │  horas          │  │  por voz        │  │  visual         │ │
│  │                 │  │                 │  │                 │ │
│  │  847h total     │  │  234 calculos   │  │  3 sites ativos │ │
│  │  40.5h semana   │  │  89% voz ok     │  │  67% progresso  │ │
│  │                 │  │                 │  │                 │ │
│  │  [ATIVO]        │  │  [ATIVO]        │  │  [ATIVO]        │ │
│  │  Abrir →        │  │  Abrir →        │  │  Abrir →        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  FIELD          │  │  OPERATOR       │  │  INSPECT        │ │
│  │  Documentacao   │  │  Logistica &    │  │  Aprovacao de   │ │
│  │  de campo       │  │  materiais      │  │  fases          │ │
│  │                 │  │                 │  │                 │ │
│  │  456 fotos      │  │  12 entregas    │  │  8 inspecoes    │ │
│  │  12 esta sem.   │  │  5 esta sem.    │  │  3 pendentes    │ │
│  │                 │  │                 │  │                 │ │
│  │  [ATIVO]        │  │  [ATIVO]        │  │  [DISPONIVEL]   │ │
│  │  Abrir →        │  │  Abrir →        │  │  Ativar →       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  SHOP           │  │  SHEETCHAT      │  │  MONITOR        │ │
│  │  Loja de        │  │  Comunicacao    │  │  Painel do      │ │
│  │  equipamentos   │  │  de equipe      │  │  supervisor     │ │
│  │                 │  │                 │  │                 │ │
│  │  2 pedidos      │  │                 │  │  (supervisores) │ │
│  │  $127.50 total  │  │                 │  │                 │ │
│  │                 │  │                 │  │                 │ │
│  │  [ATIVO]        │  │  [EM BREVE]     │  │  [DISPONIVEL]   │ │
│  │  Abrir →        │  │  Me avisar →    │  │  Ativar →       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Regras:**
- Apps ATIVOS aparecem primeiro (tem dados do usuario)
- Apps DISPONIVEIS aparecem depois (usuario pode ativar)
- Apps EM BREVE aparecem por ultimo (com "Me avisar" para waitlist)
- Card do Shop mostra campanhas ativas se houver
- Card do Monitor so aparece para supervisores/admins
- Card do Analytics NAO aparece (admin-only, acesso separado)
- Cada card e clicavel → `/app/{nome}` (dashboard especifico)

### 4.4 `/club/stats` — Minhas Estatisticas

Pagina "Spotify Wrapped" permanente. O trabalhador vê sua carreira inteira.

```
┌─────────────────────────────────────────────────────────────────┐
│  MINHAS ESTATISTICAS                     [Este mes ▼] [Exportar]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CARREIRA TOTAL                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  2,847h  │ │  12      │ │  456     │ │  234     │          │
│  │  horas   │ │  sites   │ │  fotos   │ │  calculos│          │
│  │ rastreada│ │trabalhad │ │ enviadas │ │  feitos  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  HORAS POR MES (grafico de barras)                              │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  Jan ████████████████████ 168h                        │      │
│  │  Fev ███████████████████░ 162h (em andamento)         │      │
│  │  ...                                                  │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  HORAS POR SITE (pizza chart)                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  The Ridge Stage 1   ████████ 45%                     │      │
│  │  Maple Ridge Phase 2 █████    30%                     │      │
│  │  Caivan Homes        ███      20%                     │      │
│  │  Outros              █         5%                     │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  COMPARATIVO                                                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  Suas horas este mes: 162h                            │      │
│  │  Media dos Framers em Ontario: 148h                   │      │
│  │  Voce esta 9% ACIMA da media                          │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  DESTAQUES                                                       │
│  * Maior dia: 12.5h em 15/Jan (The Ridge, Lote 23)             │
│  * Streak atual: 12 dias consecutivos                           │
│  * Maior streak: 34 dias (Outubro 2025)                         │
│  * Fotos aprovadas por IA: 94% (acima da media de 87%)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fontes de dados:**
- Horas: `tmk_entries` agregadas
- Sites: `egl_sites` via `core_org_memberships`
- Fotos: `egl_photos` onde `uploaded_by = user_id`
- Calculos: `ccl_calculations`
- Comparativo: `agg_trade_weekly` (media do trade na provincia)
- Streaks: calculado a partir de `agg_user_daily`

### 4.5 `/club/badges` — Minhas Conquistas

Sistema de badges inspirado em Red Seal + jogos + LumberFi.

**Categorias de badges:**

| Categoria | Exemplos | Criterio |
|-----------|----------|----------|
| **Trade Mastery** | Apprentice Framer, Journeyman Framer, Master Framer | Horas no trade |
| **Consistencia** | Early Bird (7h por 5 dias), Iron Man (30 dias seguidos) | Streaks |
| **Clima** | Winter Warrior (-20C), Rain Fighter, Heat Survivor | Horas em condicoes adversas |
| **Qualidade** | Eagle Eye (95%+ fotos aprovadas), Perfect Phase | Taxa de aprovacao |
| **Contribuicao** | Voice Pioneer (100+ calculos voz), Photo Pro (500+ fotos) | Volume de dados |
| **Comunidade** | Team Player (compartilhou horas), Recruiter (indicou membro) | Acoes sociais |
| **Marcos** | 1000h Club, 5000h Club, 10000h Club | Marcos de carreira |
| **Sazonais** | Primeiro a logar em 2027, Canada Day Builder | Eventos especiais |

```
┌─────────────────────────────────────────────────────────────────┐
│  MINHAS CONQUISTAS                          12 de 47 badges    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DESBLOQUEADOS (12)                                             │
│                                                                  │
│  [Master Framer]  [Winter Warrior]  [Early Bird]  [1000h Club]  │
│  [Voice Pioneer]  [Photo Pro]       [Team Player] [Iron Man]    │
│  [Eagle Eye]      [Rain Fighter]    [First Login] [Recruiter]   │
│                                                                  │
│  PROXIMO A DESBLOQUEAR                                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  [5000h Club]     ████████████████████░░░  87%   │           │
│  │  Faltam 213h para desbloquear                     │           │
│  │                                                    │           │
│  │  [Perfect Month]  ████████████░░░░░░░░░░  60%    │           │
│  │  18/30 dias sem atraso este mes                   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  TODOS OS BADGES (47)                                           │
│  [...grid com badges bloqueados em cinza...]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 `/club/rewards` — Blades & Descontos

**Blades** = moeda virtual do OnSite Club (ja existe no banco).
Aqui o membro ve saldo, ganha e gasta.

```
┌─────────────────────────────────────────────────────────────────┐
│  RECOMPENSAS                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SALDO BLADES: 2,450                     [Como ganhar mais?]    │
│                                                                  │
│  NIVEL: Journeyman (proximo: Master em 550 blades)              │
│  ████████████████████████░░░░░ 82%                              │
│                                                                  │
│  ─────────────────────────────────────────────                  │
│                                                                  │
│  OFERTAS EXCLUSIVAS PARA MEMBROS                                │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │  WINTER SALE           │  │  FERRAMENTA DO MES     │        │
│  │  25% off Winter Gear   │  │  Milwaukee Impact      │        │
│  │  Valido ate 15/Mar     │  │  15% off + 100 Blades  │        │
│  │  [Ver na Shop →]       │  │  [Ver na Shop →]       │        │
│  └────────────────────────┘  └────────────────────────┘        │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │  TIM HORTONS           │  │  HOME DEPOT            │        │
│  │  $2 off Large Coffee   │  │  10% off materiais     │        │
│  │  Mostre seu cartao     │  │  Exclusivo Pro/Club    │        │
│  │  [Mostrar cupom →]     │  │  [Mostrar cupom →]     │        │
│  └────────────────────────┘  └────────────────────────┘        │
│                                                                  │
│  COMO GANHAR BLADES                                             │
│  +10  Clock-in diario (Timekeeper)                              │
│  +5   Calculo por voz (Calculator)                              │
│  +20  Foto aprovada por IA (Field/Eagle)                        │
│  +50  Badge desbloqueado                                        │
│  +100 Indicar um amigo que se torna membro                      │
│  +25  Completar fase de inspecao (Inspect)                      │
│  +15  Entrega confirmada (Operator)                             │
│                                                                  │
│  HISTORICO                                                       │
│  25/Fev  +10  Clock-in diario                                   │
│  25/Fev  +20  Foto aprovada: Lote 5                             │
│  24/Fev  +50  Badge: Winter Warrior                             │
│  24/Fev  -200 Resgatado: Luvas de inverno                       │
│  ...                                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Regras de Blades:**
- Blades sao ganhos por ATIVIDADE real (nao compraveis)
- Blades podem ser gastos na Shop (desconto) ou resgatados por cupons
- Expiram apos 12 meses de inatividade
- Descontos de parceiros sao exclusivos por tier (Free/Pro/Club)

### 4.7 `/club/news` — Novidades & Campanhas

Feed curado por admin com conteudo relevante para o trabalhador.

**Tipos de conteudo:**

| Tipo | Fonte | Exemplo |
|------|-------|---------|
| `campaign` | Admin cria | "Winter Sale: 25% off em todo gear de inverno" |
| `badge_unlock` | Sistema | "Voce desbloqueou Winter Warrior!" |
| `industry_news` | Admin curado | "Ontario: novo salario minimo em Abril" |
| `product_launch` | Admin | "Novo app: SheetChat — comunicacao de equipe" |
| `feature_update` | Admin | "Calculator agora suporta calculos de escadas" |
| `community` | Sistema/Admin | "Meetup OnSite Club Toronto: 15 de Marco" |
| `seasonal` | Admin | "Tax season: exporte suas horas para o CRA" |
| `tip` | Admin | "Dica: use o cartao digital na entrevista de emprego" |

### 4.8 `/app/{nome}` — Dashboards por App

Cada app tem seu proprio dashboard mostrando dados detalhados do usuario.

#### `/app/timekeeper` (MANTER — ja existe, melhorar)

O que ja tem e funciona:
- Tabela de horas com filtros
- Grafico de barras por dia
- Export PDF/Excel
- Edicao inline de horarios

Adicionar:
- Resumo mensal com comparativo (media do trade)
- Mapa com geofences visitados
- Alerta de horas extras (lei provincial)
- Quick action: "Iniciar turno" (deep link pro app mobile)

#### `/app/calculator`

- Historico de calculos recentes
- Templates salvos/favoritos
- Taxa de sucesso da voz
- Unidade preferida (imperial/metric toggle)
- Quick action: "Abrir calculadora" (link pro app)

#### `/app/eagle`

- Sites atribuidos com progresso
- Casas por status (not_started/in_progress/delayed/completed)
- Fotos recentes com status de validacao IA
- Timeline de eventos recentes
- Quick action: "Ver site" (deep link pro Monitor)

#### `/app/field`

- Lotes atribuidos com fase atual
- Fotos enviadas esta semana
- Taxa de aprovacao de fotos
- Agenda de fases pendentes
- Quick action: "Tirar foto" (deep link pro app)

#### `/app/operator`

- Pedidos completados/pendentes
- Fotos de entrega
- Incidentes reportados
- Sites vinculados
- Quick action: "Novo pedido" (deep link pro app)

#### `/app/inspect`

- Inspecoes pendentes/completadas
- Taxa de aprovacao
- Defects por severidade
- Tempo medio de inspecao
- Quick action: "Inspecionar" (deep link pro app)

#### `/app/shop`

- Pedidos recentes com status
- Wishlist / carrinho salvo
- Desconto atual do tier
- Produtos recomendados para o trade
- Quick action: "Ver loja" (link pro Shopify)

---

## 5. SISTEMA DE TIERS (MEMBRESIA)

### 5.1 Tres Niveis

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  FREE (Apprentice)        PRO ($9.99/mes)      CLUB ($19.99/mes)│
│  ─────────────────        ────────────────      ────────────────│
│                                                                  │
│  Timekeeper basico        Tudo do Free          Tudo do Pro     │
│  - 1 geofence             + Geofences ilimitad  + 20% Shop disc │
│  - Manual entry           + Auto geofencing     + Desconto Tim's│
│  - 7 dias historico       + Historico ilimitado  + Desconto HD   │
│                           + Export PDF/Excel     + Suporte prior.│
│  Calculator basico        + Calculator voz       + Tax reports   │
│  - 5 calc/dia             + Calc ilimitados      + Crew features │
│  - Sem historico          + Templates salvos     + Early access  │
│  - Sem voz                                       + Annual recap  │
│                           Eagle acesso           + Selo "Club"   │
│  Cartao digital basico    + Fotos ilimitadas     no cartao       │
│  - Nome + trade           + AI validation                        │
│  - Sem badges             + Timeline                             │
│                                                                  │
│  Badges limitados         Todos os badges        Badges exclusiv.│
│  - 5 basicos              + Sistema completo     + Badges Club   │
│                                                                  │
│  Blades: 1x              Blades: 2x             Blades: 3x     │
│  (multiplicador base)    (ganho dobrado)        (ganho triplo)  │
│                                                                  │
│  Shop: preco normal       Shop: 10% desconto    Shop: 20% desc  │
│                                                                  │
│  0 parceiros              Parceiros basicos      Todos parceiros │
│                                                                  │
│  Trial: N/A               Trial: 6 meses FREE   Trial: 1 mes   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Psicologia de Retencao

Baseado na pesquisa (Costco 92.9%, Amazon Prime 93%):

1. **Loss aversion** — Na tela de cancelamento, mostrar:
   - "Voce vai perder 2,450 Blades (equivalente a $24.50)"
   - "Voce vai perder o badge Master Framer"
   - "Voce vai perder 847h de historico detalhado"
   - "Voce vai perder 20% de desconto na Shop"

2. **Sunk cost** — Mostrar investimento acumulado:
   - "Voce e membro ha 14 meses"
   - "Voce economizou $127.50 com descontos"

3. **Social proof** — Mostrar que outros ficam:
   - "94% dos membros Pro renovam"
   - "Framers em Ontario preferem o plano Pro 3:1"

4. **Downgrade, nao cancel** — Oferecer downgrade pra Free antes de cancelar

---

## 6. CAMPANHAS & ENGAJAMENTO

### 6.1 Tipos de Campanha

| Tipo | Frequencia | Exemplo |
|------|-----------|---------|
| **Seasonal Drop** | 4x/ano | Winter Gear Sale (Jan), Spring Tools (Apr), Summer Safety (Jul), Fall Prep (Oct) |
| **Flash Sale** | 1-2x/mes | "48h: Milwaukee Impact Wrench 30% off" |
| **Badge Challenge** | Mensal | "Complete 5 fases este mes e ganhe badge exclusivo" |
| **Referral** | Permanente | "Indique um amigo → ambos ganham 500 Blades" |
| **Milestone** | Trigger | "Parabens por 1000h! Aqui um cupom de $10" |
| **Reativacao** | Trigger | "Sentimos sua falta! Volte e ganhe 200 Blades" |
| **Tax Season** | Anual (Mar-Apr) | "Exporte suas horas automaticamente para o CRA" |
| **Canada Day** | Anual (Jul 1) | "Happy Canada Day! Badge exclusivo + 50% off camiseta" |

### 6.2 Notificacoes

| Canal | Uso | Frequencia Max |
|-------|-----|----------------|
| In-app (news feed) | Campanhas, badges, updates | Ilimitado |
| Push notification | Badge desbloqueado, campanha urgente | 3x/semana max |
| Email | Resumo semanal, tax season, renovacao | 1x/semana max |
| SMS | Nunca | Nunca (invasivo demais) |

---

## 7. TABELAS NOVAS NECESSARIAS

### 7.1 Para o sistema de badges

```sql
-- Definicao de badges
club_badges (
  id uuid PK,
  slug varchar UNIQUE NOT NULL,     -- 'master_framer', 'winter_warrior'
  name_en, name_pt, name_fr, name_es varchar,
  description_en, description_pt varchar,
  category varchar NOT NULL,          -- 'trade', 'consistency', 'weather', 'quality', 'contribution', 'community', 'milestone', 'seasonal'
  icon_url text,
  tier varchar DEFAULT 'standard',    -- 'standard', 'rare', 'legendary'
  criteria jsonb NOT NULL,            -- { type: 'hours', threshold: 5000, trade: 'framer' }
  blades_reward int DEFAULT 50,
  is_active bool DEFAULT true,
  sort_order int,
  created_at timestamptz
)

-- Badges do usuario
club_user_badges (
  id uuid PK,
  user_id uuid FK -> core_profiles NOT NULL,
  badge_id uuid FK -> club_badges NOT NULL,
  earned_at timestamptz NOT NULL,
  progress_snapshot jsonb,            -- { hours: 5023, threshold: 5000 }
  is_featured bool DEFAULT false,     -- Mostrar no cartao digital
  UNIQUE(user_id, badge_id)
)
```

### 7.2 Para campanhas e novidades

```sql
-- Campanhas
club_campaigns (
  id uuid PK,
  slug varchar UNIQUE,
  type varchar NOT NULL,              -- 'seasonal_drop', 'flash_sale', 'badge_challenge', 'referral', 'milestone', 'reactivation', 'announcement'
  title_en, title_pt varchar NOT NULL,
  description_en, description_pt text,
  image_url text,
  cta_label varchar,                  -- "Ver na Shop", "Ativar desconto"
  cta_url text,
  target_tiers text[],                -- ['pro', 'club'] ou null para todos
  target_trades uuid[],              -- Trades especificos ou null para todos
  target_provinces text[],           -- Provincias especificas ou null
  discount_pct int,
  blades_reward int,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  is_active bool DEFAULT true,
  priority int DEFAULT 0,            -- Maior = mais destaque
  created_by uuid FK,
  created_at timestamptz
)

-- Tracking de interacao com campanha
club_campaign_interactions (
  id uuid PK,
  campaign_id uuid FK -> club_campaigns NOT NULL,
  user_id uuid FK -> core_profiles NOT NULL,
  interaction_type varchar NOT NULL,  -- 'viewed', 'clicked', 'converted', 'dismissed'
  created_at timestamptz,
  UNIQUE(campaign_id, user_id, interaction_type)
)
```

### 7.3 Para streaks

```sql
-- Streaks do usuario
club_streaks (
  id uuid PK,
  user_id uuid FK -> core_profiles NOT NULL,
  streak_type varchar NOT NULL,       -- 'daily_activity', 'daily_clockin', 'daily_photo', 'daily_calculation'
  current_count int DEFAULT 0,
  longest_count int DEFAULT 0,
  last_activity_date date,
  started_at date,
  broken_at date,
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE(user_id, streak_type)
)
```

### 7.4 Para descontos de parceiros

```sql
-- Ofertas de parceiros
club_partner_offers (
  id uuid PK,
  partner_name varchar NOT NULL,      -- 'Tim Hortons', 'Home Depot'
  partner_logo_url text,
  title_en, title_pt varchar NOT NULL,
  description_en, description_pt text,
  discount_type varchar,              -- 'percentage', 'fixed', 'bogo'
  discount_value numeric,
  coupon_code varchar,
  min_tier varchar DEFAULT 'pro',     -- 'free', 'pro', 'club'
  valid_from timestamptz,
  valid_until timestamptz,
  is_active bool DEFAULT true,
  redemption_limit int,               -- Max por usuario
  created_at timestamptz
)

-- Resgates de cupons
club_partner_redemptions (
  id uuid PK,
  offer_id uuid FK -> club_partner_offers NOT NULL,
  user_id uuid FK -> core_profiles NOT NULL,
  redeemed_at timestamptz NOT NULL,
  created_at timestamptz
)
```

### 7.5 Para news feed

```sql
-- Items do feed de novidades
club_news (
  id uuid PK,
  type varchar NOT NULL,              -- 'campaign', 'industry_news', 'product_launch', 'feature_update', 'community', 'seasonal', 'tip'
  title_en, title_pt varchar NOT NULL,
  body_en, body_pt text,
  image_url text,
  cta_label varchar,
  cta_url text,
  target_tiers text[],
  target_trades uuid[],
  published_at timestamptz,
  expires_at timestamptz,
  is_pinned bool DEFAULT false,
  is_active bool DEFAULT true,
  created_by uuid FK,
  created_at timestamptz
)
```

---

## 8. O QUE MANTER DO DASHBOARD ATUAL

| Feature Atual | Decisao | Motivo |
|---------------|---------|--------|
| Login/Signup email-first | **MANTER** | Funciona bem, UX inteligente |
| Profile management | **MANTER** → mover para `/account/profile` | Core feature |
| Subscription (Stripe) | **MANTER + EXPANDIR** → 3 tiers | Ja funciona, precisa mais tiers |
| Device management | **MANTER** → mover para `/account/devices` | Necessario |
| Timekeeper dashboard | **MANTER + MELHORAR** → `/app/timekeeper` | Feature principal |
| Blades rewards | **MANTER + EXPANDIR** → `/club/rewards` | Base existe |
| AI Assistant widget | **MANTER** | Diferencial (mover para Pro+) |
| Calculator page | **SUBSTITUIR** → `/app/calculator` com stats | Card sem conteudo hoje |
| Shop page | **SUBSTITUIR** → `/app/shop` com pedidos reais | Hoje so link pro Shopify |
| Courses (coming soon) | **REMOVER** | Nao e prioridade agora |
| Checklist (coming soon) | **REMOVER** | Eagle/Inspect cobrem isso |
| Legal pages | **MANTER** → `/legal/*` | Obrigatorio |

---

## 9. PRIORIDADES DE IMPLEMENTACAO

### Fase 1: Foundation (Semana 1-2)
- [ ] Reestruturar rotas (`/club/`, `/account/`, `/app/`)
- [ ] Hub principal (`/club/`) com cards de apps + stats semanais
- [ ] Melhorar cards dos apps (mostrar dados reais de cada app)
- [ ] Mover profile/subscription/devices para `/account/`

### Fase 2: Identity (Semana 3-4)
- [ ] Criar tabelas de badges (`club_badges`, `club_user_badges`)
- [ ] Cartao digital do trabalhador (`/club/card`)
- [ ] Sistema de streaks (`club_streaks`)
- [ ] Pagina de estatisticas (`/club/stats`)

### Fase 3: Rewards (Semana 5-6)
- [ ] Expandir Blades com novas formas de ganhar
- [ ] Criar tabelas de campanhas (`club_campaigns`)
- [ ] Criar news feed (`/club/news`)
- [ ] Descontos na Shop por tier

### Fase 4: Engagement (Semana 7-8)
- [ ] Badges automaticos (triggers no backend)
- [ ] Pagina de badges (`/club/badges`)
- [ ] Campanhas sazonais
- [ ] Ofertas de parceiros (`club_partner_offers`)

### Fase 5: Polish (Semana 9-10)
- [ ] Dashboards por app (`/app/*`) com dados reais
- [ ] Export de horas para CRA (tax season)
- [ ] Notificacoes de badges/campanhas
- [ ] Onboarding de primeiro acesso

---

## 10. METRICAS DE SUCESSO

| Metrica | Alvo | Como medir |
|---------|------|-----------|
| Taxa de renovacao | > 85% | `bil_subscriptions` (renewed vs churned) |
| Sessoes semanais | > 2 por usuario | `agg_user_daily` |
| Tempo na pagina | > 3 min | `log_events` (session duration) |
| Badges desbloqueados | > 5 media por usuario ativo | `club_user_badges` |
| Blades gastos vs ganhos | > 30% gastos | `blades_transactions` |
| NPS | > 50 | Survey in-app |
| Upsell Free→Pro | > 15% | `bil_subscriptions` transitions |
| Upsell Pro→Club | > 10% | `bil_subscriptions` transitions |

---

## 11. NOTAS TECNICAS

### Stack
- Next.js 16.x + React 19 (ja e assim)
- Tailwind CSS com tema Enterprise v3 (atualizar de amber para teal #0F766E)
- Supabase Auth + RLS
- Stripe (ja integrado)
- Recharts (graficos)
- i18n: `next-intl` ou similar para PT/EN/FR

### Packages usados
- `@onsite/supabase` — Cliente Supabase SSR
- `@onsite/utils` — cn(), formatters
- `@onsite/auth` — Auth flows (migrar do auth custom atual)
- `@onsite/shared` — Types compartilhados
- `@onsite/ui` — Componentes base (se criar componentes reutilizaveis)

### Cores (migrar de amber para Enterprise v3)
```
Primaria:    #0F766E (teal-700) — accent/CTA
Background:  #F6F7F9 — pagina
Surface:     #FFFFFF — cards
Text:        #101828 — primario
Text muted:  #667085 — secundario
Borda:       #E5E7EB — divisores
Success:     #10B981 — verde
Warning:     #F59E0B — amber (antigo primario, agora warning)
Error:       #EF4444 — vermelho
```

---

*Documento criado por Cerbero — Guardiao do OnSite Club*
*Baseado em pesquisa de: Amazon Prime, Costco, LumberFi, Procore, Buildertrend, Fieldwire, Workyard*

---

## 12. ONSITE CARD — Cartao de Pagamento Proprio

> Spec completa em ONSITE_CARD_SPEC.md

No dashboard, o cartao sera **UI funcional com dados mockados** (waitlist + preview).
A integracao real com emissor (Peoples Group ou Lithic) sera feita em projeto separado.

### Resumo

- Stripe Issuing NAO funciona no Canada
- Alternativas: Peoples Group (recomendado), Lithic, Dash Solutions
- OnSite = program manager (marca/UX), Emissor = regulacao financeira
- Casos: Blades->CAD, Payroll, Expense, Desconto auto, Dados Prumo
- Cartao fisico: 3 variantes (basico/prata/dourado), NFC, marca OnSite
- Impacto: triplica receita ($15 -> $45/user/mes)

### No Dashboard (Fase 0 — mockup)

Nova rota: `/club/wallet`
- Visualizacao do cartao (estatico, bonito)
- Saldo: "$0.00 — Disponivel em breve"
- Banner: "OnSite Card chegando em Q4 2026"
- Formulario de waitlist
- Acoes desabilitadas (Carregar, Converter, Congelar, Extrato)

### Tabelas `crd_*` — NAO criar agora

Serao criadas quando iniciar integracao real (Q2-Q3 2026):
- `crd_cardholders`, `crd_cards`, `crd_transactions`
- `crd_blades_ledger`, `crd_funding_events`

---

## 13. ARQUITETURA DE PAGINAS FINAL (com Card)

```
onsite-club.ca/
|
|-- /                           <- Landing (login/signup)
|-- /auth/callback              <- OAuth/magic link
|-- /reset-password
|
|-- /club/                      <- HUB PRINCIPAL
|   |-- /club/apps              <- Meus Apps
|   |-- /club/stats             <- Minhas Estatisticas
|   |-- /club/card              <- Cartao Digital (identidade)
|   |-- /club/wallet            <- OnSite Card (pagamento) <- NOVO
|   |-- /club/badges            <- Minhas Conquistas
|   |-- /club/rewards           <- Blades + Descontos
|   |-- /club/news              <- Novidades & Campanhas
|   +-- /club/community         <- Comunidade (futuro)
|
|-- /account/                   <- CONTA
|   |-- /account/profile
|   |-- /account/subscription
|   |-- /account/devices
|   |-- /account/privacy
|   +-- /account/security
|
|-- /app/                       <- DASHBOARDS POR APP
|   |-- /app/timekeeper
|   |-- /app/calculator
|   |-- /app/eagle
|   |-- /app/field
|   |-- /app/operator
|   |-- /app/inspect
|   +-- /app/shop
|
|-- /legal/
|   |-- /legal/terms
|   |-- /legal/privacy
|   |-- /legal/security
|   +-- /legal/cancellation
|
+-- /admin/
    |-- /admin/users
    |-- /admin/analytics
    +-- /admin/campaigns
```
