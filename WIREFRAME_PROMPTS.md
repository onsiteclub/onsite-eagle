# WIREFRAME PROMPTS — OnSite Eagle Apps

> **Data:** 2026-02-24
> **Objetivo:** Prompts para gerar wireframes com IA (v0.dev, Figma AI, Midjourney, etc.)
> **Apps prontos:** Timekeeper, Calculator, Monitor
> **Apps neste doc:** Operator, Inspect, Dashboard, Analytics, Auth, Shop, Minutes (integrado)

---

## DESIGN SYSTEM (aplicar a TODOS)

```
Brand: OnSite Club — "Wear what you do!"
Industry: Canadian residential construction
Platform: Android-first (mobile), Desktop-first (web)

Color Palette (Enterprise Theme v3.0):
  Background:   #F6F7F9 (light gray)
  Cards/Surface: #FFFFFF
  Text Primary:  #101828
  Text Secondary: #667085
  Accent Green:  #0F766E (actions, buttons, CTAs)
  Accent Amber:  #C58B1B (active tabs, warnings, highlights)
  Error/Danger:  #DC2626
  Borders:       #E5E7EB

Typography: Inter or system default, clean and professional
Icons: Ionicons style (outline)
Corner radius: 8-12px
Shadows: subtle (elevation 1-2)
```

---

## 1. OPERATOR — Mobile App (Android)

### Contexto
O Operator e o app mais **simples** do ecossistema. E um app de **alimentacao**:
recebe pedidos de material, diz "em andamento" ou "entregue", e pronto.
O operador (maquinista/motorista) vive na tela de requests 95% do tempo.

**Principio:** "Esse app e apenas de alimentacao dos outros."

3 tabs: **Requests** (principal) | **Reportar** (problemas) | **Config** (settings)
Cor accent: **#0F766E** (verde unificado com todo o ecossistema)

### Telas

#### 1.1 Requests Queue (TELA PRINCIPAL — 95% do tempo)

```
PROMPT:

Design an Android mobile wireframe for a material delivery queue — the PRIMARY
screen of a construction operator/driver app. The operator lives on this screen.
Cards are auto-sorted by urgency (app decides, most urgent on top).
Enterprise theme: #F6F7F9 bg, #0F766E green accent, #DC2626 red for urgent.

Screen layout:
- Top status bar: "✓ Synced 2 min ago" (green) or "⚠ Offline — 3 pending" (amber)
- Header: "OnSite Operator" title + notification bell (right) +
  availability toggle [⚡ON] (green pill, top right — tappable to go OFF)
- No filter chips — the app auto-sorts everything. Simple.

- Main content: Scrollable list of request cards (full width, stacked):

  Card 1 (URGENT — red left border, #DC2626):
    Material: "Steel Posts x4" (bold, 18sp)
    Location: "Lot 023 — Maple Ridge" (14sp, gray)
    Requester: "John D. · 2h ago" (12sp, light gray)
    Red badge: "URGENTE" (top right)
    Two action buttons (bottom of card, side by side):
      [🚛 EM ANDAMENTO] (outline button, 48dp height)
      [✅ ENTREGUE] (green filled button, 48dp height)

  Card 2 (PENDING — amber left border, #C58B1B):
    Material: "2x10 Hangers x12"
    Location: "Lot 015 — Maple Ridge"
    Requester: "Carlos M. · 5h ago"
    Amber badge: "PENDENTE"
    Same two buttons

  Card 3 (IN TRANSIT — green left border, #0F766E):
    Material: "Tyvek Roll x2"
    Location: "Lot 008 — Cedar Park"
    Requester: "Carlos M. · 3h ago"
    Green badge: "EM ANDAMENTO" + truck icon
    ONE button only: [✅ ENTREGUE]
    (already in transit, only needs delivery confirmation)

  Card 4 (DELIVERED — gray, muted, bottom of list):
    Material: "Lumber Bundle"
    Location: "Lot 012 — Maple Ridge"
    Gray badge: "ENTREGUE ✓"
    "Ontem · 14:30" timestamp
    No buttons — completed. Card fades or collapses.

- Bottom tab bar (3 tabs):
  📋 Requests (active, green underline) | ⚠️ Reportar | ⚙️ Config

CRITICAL DESIGN RULES:
- Cards must be LARGE (min 120dp height) for gloved hands
- Action buttons must be 48dp+ touch targets
- Color-coded left borders are the primary urgency signal
- No unnecessary information — material, location, who, when, action
- Works in bright sunlight (high contrast)
- This is a TODO LIST for a driver, not a dashboard
Device: Samsung Galaxy (1080x2400), Android status bar visible.
```

#### 1.2 Delivery Evidence (Timeline do Lot — apos marcar "Entregue")

```
PROMPT:

Design an Android mobile wireframe for a delivery evidence screen that opens
AFTER the operator marks a request as "Delivered". Shows the lot's shared timeline
where the operator can post a photo or note as proof of delivery.
Enterprise theme: #F6F7F9 bg, #0F766E green.

Screen layout:
- Top: Back arrow + "Entrega — Lot 023" + green "ENTREGUE ✓" badge
- Header card (white, compact):
  "Steel Posts x4 · Length: 109in · Type: 15B"
  "Maple Ridge Phase 2"
  "Solicitado por: John D. · Supervisor"
  "Entregue agora por: Mike T." (auto-filled)

- Divider: "Timeline do Lot 023" label

- Lot timeline feed (WhatsApp-style, read-only with action bar):
  Recent events from this lot (shared with Monitor/Timekeeper):
    "Carpenter 🔨 — 10:32 AM"
    [photo] "North wall framing complete"

    "System 🤖 — 10:45 AM"
    "Carlos completed Roof Ply on Lot 023"

    "Operator 🚛 — agora" (new, highlighted)
    "Steel Posts x4 entregues por Mike T."
    (auto-generated delivery event)

- Bottom action bar (sticky, 2 large buttons):
  [📷 Foto de Entrega] [📝 Adicionar Nota]
  Below: [← Voltar pra Fila] ghost button

Tapping "Foto de Entrega" opens camera → photo auto-posted to lot timeline.
Tapping "Adicionar Nota" opens text input → note posted to lot timeline.
After posting → returns to Requests Queue automatically.

This screen is OPTIONAL — operator can skip and go back to queue.
The delivery is already confirmed. This is just for evidence/documentation.
Minimal UI. Quick in-and-out.
```

#### 1.3 Card Expand (Info sem timeline — tap no card sem entregar)

```
PROMPT:

Design an Android mobile wireframe for an expanded material request card
shown when the operator taps a card to see more details (WITHOUT delivering).
This is NOT the delivery screen — just more info about the request.
Enterprise theme: #F6F7F9 bg, #0F766E green.

Screen layout (modal bottom sheet or inline expansion):
- Header: "Steel Posts x4" (bold) + urgency badge (URGENTE, red)
- Details section:
  Material type: "Steel Post"
  Subtype: "15B"
  Quantity: "4 units"
  Length: "109 inches"
- Location section:
  Lot: "023 — Fairbank 3D"
  Site: "Maple Ridge Phase 2"
  Small static map thumbnail (optional, if GPS available)
- Requester section:
  Avatar + "John D." + "Supervisor"
  "Requested: Feb 24, 2026 at 10:32 AM"
  Notes from requester: "South wall, need ASAP for weld schedule"
- Action buttons (same as in queue card):
  [🚛 EM ANDAMENTO] [✅ ENTREGUE]
- [← Fechar] ghost button

Simple bottom sheet. No timeline here — timeline only after delivery.
Quick glance at details, then back to action.
```

#### 1.4 Reportar Tab (Problemas do Veiculo/Maquina)

```
PROMPT:

Design an Android mobile wireframe for a vehicle/equipment issue reporting screen
in a construction operator app. Quick-tap buttons, no forms.
Issues go to the SITE-LEVEL timeline (supervisor sees in Monitor).
Enterprise theme: #F6F7F9 bg, #0F766E green, #DC2626 red for issues.

Screen layout:
- Top: "Reportar Problema" title
- Subtitle: "O supervisor sera notificado imediatamente"

- Grid of large issue buttons (2 columns, square cards ~160dp each):

  [⛽]                    [🔧]
  "Preciso de             "Pneu Furou"
   Gasolina"

  [🚫]                    [🔩]
  "Maquina Nao            "Problema
   Funciona"               Mecanico"

  [⚠️]                    [📝]
  "Acidente /             "Outro
   Seguranca"              Problema"

- Each button: large icon (48dp) + label text below (14sp, 2 lines max)
- "Outro Problema" opens text input (multiline) + [Enviar] button

- After tapping a button:
  Brief animation: "✓ Enviado ao supervisor"
  Returns to button grid after 2 seconds
  Event created: sendMessage({ site_id, house_id: null, sender_type: 'operator',
    content: 'Maquina nao funciona', event_type: 'vehicle_issue' })

- Bottom: "Historico" link → simple list of past reports (date + type + status)
- Tab bar: Reportar tab active

HUGE buttons. One tap to report. No forms, no typing (except "Outro").
Driver might be stressed (flat tire, breakdown) — must be instant.
Accessibility: works with one hand, works with gloves.
```

#### 1.5 Config Tab (Settings + Disponibilidade)

```
PROMPT:

Design an Android mobile wireframe for an operator app settings screen
with a prominent availability toggle. Construction delivery operator app.
Enterprise theme: #F6F7F9 bg, #0F766E green.

Screen layout:
- Top: "Configuracoes" title

- Section 1: AVAILABILITY (prominent, top of page):
  Large card with green/red visual state:
  [WHEN ON]:
    Green background card (#E6F4F1)
    "⚡ DISPONIVEL" (large, green text)
    "Voce esta recebendo pedidos"
    Toggle switch (ON, green)
  [WHEN OFF]:
    Red/gray background card (#FEE2E2)
    "⏸ INDISPONIVEL" (large, red text)
    "Pedidos estao na fila. Supervisores foram notificados."
    Toggle switch (OFF, red)
    Optional: "Motivo" text input (e.g., "Almoco", "Fim do dia")
    "Indisponivel desde: 12:30 PM"

- Section 2: "QR Code" row → opens camera for QR scanning
  Subtitle: "Vincular a um site ou lote"

- Section 3: "Notificacoes" row with toggle
  Subtitle: "Sons e alertas para novos pedidos"

- Section 4: "Meu Perfil" row:
  Avatar + "Mike Thompson" + "Operador"
  Worker code: "OSC-04821"
  Tap → profile detail (name, site assignment, contact)

- Section 5: "Sobre" row → app version, legal
- Bottom: "🚪 Sair" red text button

- Tab bar: Config tab active

The availability toggle is the MOST IMPORTANT element on this screen.
It must be immediately visible and obvious (big, colorful, top of page).
When OFF, other users get: "Operador indisponivel. Pedido na fila."
```

---

## 2. INSPECT — Mobile App (Android/Tablet)

### Contexto
O Inspect e o app do **inspetor de campo** (building inspector / quality checker).
Ele inspeciona lotes, verifica checklists de 140 itens codificados (FRAME-CHECK),
tira fotos com metadata GPS, aprova/rejeita fases. Funciona offline.
Otimizado para TABLET (landscape mode tambem).

### Telas

#### 2.1 Home (Assigned Lots)

```
PROMPT:

Design an Android tablet wireframe (landscape orientation option) for a construction
inspection app's home screen. Enterprise theme: #F6F7F9 bg, #0F766E green, #C58B1B amber.

Screen layout:
- Top: App bar "OnSite Inspect" with sync status indicator (green dot = synced,
  amber = pending sync, red = offline) and notification bell
- Section 1: "My Inspections Today" summary bar:
  "3 Scheduled" | "1 In Progress" | "2 Completed" — horizontal stat chips
- Section 2: Grid of lot cards (2 columns on tablet, 1 on phone):
  Card 1 (Scheduled - amber border):
    "Lot 023 — Fairbank 3D", "Maple Ridge Phase 2"
    "Phase: Frame Check", progress bar 85%
    "Scheduled: 2:00 PM today"
    Small avatar: "Assigned by: John D."
  Card 2 (In Progress - green border):
    "Lot 015 — Quinton 5D", "Maple Ridge Phase 2"
    "Phase: City Framing Inspection"
    "Started: 11:30 AM", "12/19 items checked"
    Green "CONTINUE" button
  Card 3 (Completed - gray, checkmark):
    "Lot 008 — Mapleton 3G", "Cedar Park"
    "Phase: Frame Check — PASSED", green checkmark
    "Completed: 9:45 AM"
  Card 4 (Failed - red border):
    "Lot 012 — Frontenac 4", "Maple Ridge"
    "Phase: Frame Check — FAILED", red X
    "3 critical items failed", "Needs re-inspection"
- Bottom: 3-tab navigation: Home (active) | Scan | History
  Icons: home, qr-code, clock

Professional inspection tool aesthetic. Clean, data-dense but organized.
Optimized for quick scanning in the field.
```

#### 2.2 Lot Inspection Detail

```
PROMPT:

Design an Android mobile wireframe for a construction lot inspection detail screen.
Enterprise theme: #F6F7F9 bg, #0F766E green accent.

Screen layout:
- Top: Back arrow + "Lot 023 — Fairbank 3D" + overflow menu (...)
- Sub-header card: "2275 sqft | Frame Check Inspection"
  Workers: "CAP: Cristony | FRAME: Carlos | ROOF: Carlos"
  Status badge: "IN PROGRESS" (amber)
- Tab bar (horizontal, scrollable): Overview | Checklist | Photos | Timeline | Notes

[OVERVIEW TAB shown]:
- Phase Progress (vertical list with status icons):
  ✅ backfill (completed)
  ✅ frame start (completed)
  ✅ Roof Ply — Apr 27 (completed)
  ✅ backing — Apr 21 (completed)
  🔍 framecheck — IN INSPECTION (highlighted, amber bg)
  ⬜ wire (pending)
  ⬜ city framing (pending)
- Inspection Score card:
  "Frame Check Progress: 85/140 items reviewed"
  Progress bar (green portion + gray remaining)
  "Critical Items: 2 failed" (red text)
  "Standard Items: 3 failed" (amber text)
- Action buttons row:
  [📷 Add Photo] [✅ Continue Checklist] [📝 Add Note]

Clean, information-dense inspection tool layout.
```

#### 2.3 Checklist Screen (FRAME-CHECK — 140 items)

```
PROMPT:

Design an Android mobile wireframe for a detailed construction inspection checklist.
This is the core screen of the app — 140 coded inspection items across 8 categories.
Enterprise theme: #F6F7F9 bg, #0F766E green for pass, #DC2626 red for fail.

Screen layout:
- Top: Back arrow + "Frame Check — Lot 023"
- Sub-header: "85/140 items reviewed" with progress bar
  Filter chips: "All", "Pending" (selected), "Passed", "Failed"
- Category accordion sections (expandable):

  [▼ ROOF AND ATTIC (RA) — 18/23 reviewed, 2 failed]
    ✅ RA01: Trusses following layout details
    ✅ RA02: Truss hangers fully nailed
    ❌ RA03: Multi-ply trusses and beams — FAILED
      Red sub-card: "Not fully nailed on south section"
      [📷 1 photo attached] [Edit]
    ✅ RA04: Roof return leveled
    ⬜ RA05: Firestop complete (not yet reviewed)
    ... (collapsed, "5 more items")

  [► MAIN FLOOR WALL (MW) — 0/19 reviewed] (collapsed)
  [► SECOND FLOOR DECK (SF) — 17/17 ✓ ALL PASSED] (green indicator)
  [► STAIRS (ST) — 10/15 reviewed, 1 failed]
  [► MAIN FLOOR DECK (MF) — 20/24 reviewed]
  [► OUTSIDE (OS) — 8/10 reviewed]
  [► GARAGE (GA) — 5/7 reviewed]
  [► SECOND FLOOR WALLS (SW) — 7/25 reviewed]

- Each unchecked item, when tapped, expands to:
  [PASS ✅] [FAIL ❌] buttons (large, side by side)
  Optional: "Add note" text field
  Optional: "📷 Take Photo" button (for evidence)

- Bottom sticky bar: "85/140 Complete" + [Submit Inspection] button (disabled until 100%)

This is a CRITICAL workflow screen. Must be efficient for field use.
Large touch targets. Clear pass/fail visual distinction.
Category sections collapsible to manage 140 items.
```

#### 2.4 Photo Capture with Metadata

```
PROMPT:

Design an Android mobile wireframe for a construction inspection photo capture screen.
Shows camera viewfinder with metadata overlay.

Screen layout:
- Full-screen camera viewfinder
- Top overlay (semi-transparent dark bar):
  "Lot 023 — RA03: Multi-ply trusses" (context of what's being photographed)
  GPS coordinates: "45.3547, -75.8734" with accuracy indicator "±3m"
- Bottom overlay:
  Left: Thumbnail of last photo taken (small circle)
  Center: Large shutter button (white circle, 72dp)
  Right: Flash toggle icon
- Below camera:
  "Photo Type" selector chips: "Evidence", "Detail", "Overview", "Issue"
  "Note" text input: "South section, beam junction not fully nailed"
- Auto-captured metadata (shown as subtle info row):
  "Device: SM-G990W | Compass: 245° SW | Time: 14:32:05"

Professional inspection photo tool.
Metadata is captured automatically — inspector just needs to point and shoot.
GPS + compass + timestamp for Prumo AI training data.
```

#### 2.5 QR Scan

```
PROMPT:

Design an Android mobile wireframe for a QR code scanner screen in a construction inspection app.
Enterprise theme with #0F766E green accent.

Screen layout:
- Top: "Scan Lot QR Code" header
- Center: Camera viewfinder with QR scanning frame (rounded corners, animated)
  Green corner brackets, subtle scanning animation line
  Text below frame: "Point camera at the lot QR code"
- Below: "Or enter lot number manually" link
  Text input: "Lot #" with search icon
- Recent scans list (3 items):
  "Lot 023 — Fairbank 3D" — "Scanned today 10:32 AM"
  "Lot 015 — Quinton 5D" — "Scanned yesterday"
  "Lot 008 — Mapleton 3G" — "Scanned Feb 22"

Clean, focused scanning interface. Large viewfinder area.
```

---

## 3. DASHBOARD — Web App (Next.js)

### Contexto
Dashboard e o **hub web unificado** onde usuarios gerenciam suas contas,
assinaturas, e acessam versoes web de todos os apps (Timekeeper hours,
Calculator settings, Shop). Sidebar navigation.

### Telas

#### 3.1 Main Layout + Account Overview

```
PROMPT:

Design a desktop web wireframe for a construction SaaS dashboard.
Enterprise theme: #F6F7F9 bg, #FFFFFF cards, #0F766E green, #C58B1B amber.
Tailwind CSS inspired, clean professional aesthetic.

Layout:
- Left sidebar (240px, white, fixed):
  OnSite Club logo at top
  User section: avatar + "Cristony Santos" + "Carpenter" subtitle
  Navigation (icons + labels):
    📊 Overview (active, green bg highlight)
    ⏱ Timekeeper
    🧮 Calculator
    🛒 Shop
    💳 Billing
    ─── separator ───
    👤 Profile
    ⚙️ Settings
    📞 Support
  Bottom: "v2.1.0" version, "Sign Out" link

- Main content area (right):
  Header: "Welcome back, Cristony" + date "Monday, Feb 24, 2026"

  Row 1 (3 stat cards):
    "Hours This Week": "32h 15min" (green trend arrow up +12%)
    "Active Subscription": "Timekeeper Pro" (green badge)
    "Sites Assigned": "2"

  Row 2 (2 columns):
    Left: "Recent Activity" card (list of 5 events):
      "Clock-in at Maple Ridge" — "Today 7:30 AM"
      "Photo uploaded: Lot 023 framing" — "Yesterday"
      "Export generated: February hours" — "Feb 20"
    Right: "Quick Actions" card:
      [📊 View Hours Report] button
      [📷 Upload Photo] button
      [👥 Manage Team] button
      [📄 Export Data] button

Desktop-first, responsive layout. Professional SaaS dashboard feel.
Similar aesthetic to Stripe Dashboard or Linear.
1440px viewport width.
```

#### 3.2 Timekeeper Section (Hours Dashboard)

```
PROMPT:

Design a desktop web wireframe for a construction hours tracking dashboard.
Part of a larger SaaS dashboard (sidebar navigation on left).
Enterprise theme: #F6F7F9 bg, #0F766E green, #C58B1B amber.

Layout (main content area, sidebar already present):
- Top: "Timekeeper" breadcrumb, date range picker (this week/month/custom)
- Row 1 (4 stat cards):
  "Total Hours": "147h 30min" | "Days Worked": "18" | "Avg/Day": "8h 12min" | "Overtime": "12h" (amber)

- Row 2: Hours chart (bar chart, daily hours for the month):
  X-axis: dates, Y-axis: hours
  Bars colored green (regular) and amber (overtime, >8h)
  Horizontal line at 8h (daily target)

- Row 3 (2 columns):
  Left (60%): "Entries" table:
    Columns: Date | Site | Clock In | Clock Out | Duration | Method
    Rows with alternating white/gray bg
    "Feb 24 | Maple Ridge | 7:30 AM | 4:00 PM | 8h 30m | Auto (GPS)"
    "Feb 23 | Maple Ridge | 7:15 AM | 3:45 PM | 8h 30m | Auto (GPS)"
    Edit icon on hover, pagination at bottom
  Right (40%): "Sites Breakdown" pie chart:
    "Maple Ridge: 120h (81%)" — green
    "Cedar Park: 27h 30m (19%)" — amber

- Bottom row: Export buttons:
  [📄 Export PDF] [📊 Export CSV] [📧 Email Report]

Clean data-dense dashboard. Optimized for payroll review and hour tracking.
Similar to Toggl Track or Clockify dashboards.
```

#### 3.3 Team Management (QR + Workers)

```
PROMPT:

Design a desktop web wireframe for a construction team/crew management page.
Part of a SaaS dashboard. Enterprise theme: #F6F7F9 bg, #0F766E green.

Layout (main content area):
- Top: "My Team" header + [+ Add Worker] green button
- Section 1: "QR Code Sharing" card:
  Left: Large QR code (200x200px) with "Scan to share your hours"
  Right: Explanation text: "Workers scan this code to share their hours with you.
  Access is immediate — no approval needed."
  Below: "Active Links: 4" | [Regenerate QR] ghost button

- Section 2: "Team Members" table:
  Columns: Worker | Trade | Status | Hours This Week | Last Active | Actions
  Row: Avatar + "Carlos M." | "Framer" | Green "Active" badge | "38h" | "2h ago" | [View] [Revoke]
  Row: Avatar + "Gabriel S." | "Roofer" | Green "Active" | "42h" | "1h ago" | [View] [Revoke]
  Row: Avatar + "Yuri K." | "Backing" | Amber "Idle" | "0h" | "3 days ago" | [View] [Revoke]
  Row: Avatar + "Andrey P." | "Framer" | Gray "Offline" | "32h" | "1 week ago" | [View] [Revoke]

- Section 3: "Team Stats" row of cards:
  "Total Team Hours": "152h" | "Active Workers": "3/4" | "Top Performer": "Gabriel S. (42h)"

Professional HR-lite interface for construction supervisors.
```

---

## 4. ANALYTICS — Web App (Next.js)

### Contexto
Analytics e o **painel de inteligencia de negocios** para admin/super_admin.
Modelo de 5 esferas: Identity, Business, Product, Debug, Visual.
Acesso restrito por aprovacao (admin_users). Inclui AI assistant (Teletraan9).

### Telas

#### 4.1 Overview Dashboard (5 Spheres)

```
PROMPT:

Design a desktop web wireframe for a workforce analytics dashboard overview page.
Admin-only business intelligence tool for a construction SaaS platform.
Enterprise theme: #F6F7F9 bg, #0F766E green, #C58B1B amber. Dark sidebar option.

Layout:
- Left sidebar (dark, 220px):
  "OnSite Analytics" logo + "ADMIN" badge
  Navigation sections:
    OVERVIEW
      📊 Dashboard (active)
    DATA SPHERES
      👤 Identity
      💼 Business
      📱 Product
      🔧 Debug
      📷 Visual
    TOOLS
      🔍 Queries
      📋 Reports
      🤖 AI Assistant
      📤 Export
  Bottom: Admin name + role badge "super_admin"

- Main content:
  Header: "Platform Overview" + date range selector + "Last updated: 2 min ago"

  Row 1: 5 Sphere Cards (horizontal, equal width):
    IDENTITY: "1,247 users" + "↑ 12% this month" + mini sparkline
    BUSINESS: "$14,230 MRR" + "↑ 8%" + sparkline
    PRODUCT: "89% retention" + "↓ 2%" (amber) + sparkline
    DEBUG: "0.3% crash rate" + "↓ steady" (green) + sparkline
    VISUAL: "2,340 photos" + "↑ 156 this week" + sparkline

  Row 2 (2 columns):
    Left: "User Growth" line chart (12 months, dual line: total + active)
    Right: "Revenue by App" stacked bar chart:
      Timekeeper (green), Calculator (blue), Shop (amber)

  Row 3 (3 columns):
    "Top Provinces": horizontal bar chart (Ontario, Quebec, BC, Alberta)
    "Active Trades": donut chart (Carpenter 40%, Framer 25%, Roofer 15%, Other 20%)
    "Alerts": list of 3 items with severity badges
      "🔴 Crash spike in Calculator v2.3"
      "🟡 Churn risk: 23 users inactive 14+ days"
      "🟢 New milestone: 1,200 users"

Data-rich executive dashboard. Similar to Mixpanel or Amplitude.
Dark sidebar with light main content area.
```

#### 4.2 AI Assistant (Teletraan9)

```
PROMPT:

Design a desktop web wireframe for an AI data analyst chat interface
embedded in a business analytics dashboard. Clean, professional aesthetic.

Layout:
- Left: Analytics sidebar (collapsed to icons only, 60px)
- Main content: Full-width chat interface

- Top bar: "🤖 Teletraan9 — AI Data Analyst" + "Powered by GPT-4o" badge (subtle)

- Chat area (scrollable, centered max-width 800px):
  AI message (left, subtle gray bg):
    "Hello! I'm Teletraan9, your workforce data analyst.
    I can analyze user data, generate reports, and decode Reference codes.
    What would you like to explore?"

  User message (right, green bg):
    "Show me the top 10 users by hours tracked this month"

  AI message with embedded visualization:
    "Here are the top 10 users by hours tracked in February 2026:"
    [Embedded bar chart: horizontal bars with user names and hours]
    "Notable: Carlos M. leads with 186 hours, 23% above average.
    3 users are above 160 hours which may indicate overtime concerns."
    [📊 View Full Report] [📤 Export CSV] action buttons

  User message: "Decode QC-A3F8-0106-03"

  AI message:
    "Decoded Reference: QC-A3F8-0106-03"
    [Info card]:
      Region: Quebec
      User suffix: A3F8
      Date: January 6
      Sessions: 3
    "Found matching user: André Filipe (Quebec City).
    Active subscriber, Timekeeper Pro. Last active 2 days ago."

- Bottom: Chat input bar with:
  Text input: "Ask Teletraan9 anything..."
  Quick action buttons: [📊 Analysis] [📋 Report] [🔍 Decode Ref#] [📈 Visualize]
  Send button (green)

Professional AI chat interface. Similar to ChatGPT but specialized for data analysis.
Embedded charts/tables within chat responses.
```

#### 4.3 Identity Sphere (User Cohorts)

```
PROMPT:

Design a desktop web wireframe for a user identity/cohort analysis page
in a workforce analytics dashboard.

Layout (with dark sidebar):
- Header: "Identity Sphere" breadcrumb + "1,247 total users"
- Filter bar: Date range + Province dropdown + Trade dropdown + Plan dropdown

- Row 1 (3 cards):
  "New Users (30d)": "147" with trend
  "Churn Risk": "23 users" (amber) with [View List] link
  "Profile Completeness": "67% avg" with gauge chart

- Row 2: "User Cohorts" heatmap/retention table:
  Rows = signup month (Jan 2025 ... Feb 2026)
  Columns = months since signup (1, 2, 3... 12)
  Cells colored green (high retention) to red (low retention)
  Classic cohort retention heatmap

- Row 3 (2 columns):
  Left: "Users by Province" map of Canada (choropleth, darker = more users)
  Right: "Users by Trade" table:
    Trade | Count | % | Avg Hours/Week | Churn Rate
    Carpenter | 498 | 40% | 38h | 5%
    Framer | 312 | 25% | 42h | 3%
    ...

- Row 4: "User Health Scores" distribution histogram:
  X-axis: health score 0-100
  Y-axis: number of users
  Green zone (80-100), amber (50-79), red (0-49)

Data analysis tool for understanding the user base.
Clean Tableau-like visualizations.
```

---

## 5. AUTH — Web App (Next.js)

### Contexto
Auth e o **hub de autenticacao e billing** central. Todos os apps
redirecionam para ca para login, signup, checkout (Stripe), e
gerenciamento de assinaturas. Minimalista e confiavel.

### Telas

#### 5.1 Login / Signup

```
PROMPT:

Design a desktop and mobile web wireframe for a construction SaaS login page.
Must feel trustworthy, professional, and fast. Enterprise theme.

Layout (centered card, max-width 420px):
- Background: #F6F7F9 full page
- Top: OnSite Club logo (centered, 120px) + tagline "Wear what you do!"
- Main card (white, shadow, rounded):
  Tab toggle: "Sign In" (active) | "Sign Up"

  [SIGN IN view]:
    Email input: "your@email.com"
    Password input with eye toggle
    "Forgot password?" link (right-aligned, small, #0F766E)
    [Sign In] green button (full width, #0F766E)
    ── or ──
    [Continue with Google] button (outline, Google icon)
    [Continue with Microsoft] button (outline, MS icon)

  [SIGN UP view]:
    Email input
    Password input (with strength indicator bar)
    Confirm password input
    Checkbox: "I agree to the Terms of Service and Privacy Policy" (links)
    [Create Account] green button
    ── or ──
    Social login buttons

- Bottom: "Protected by Supabase Auth" subtle text
  Links: Privacy Policy | Terms of Service | Support

Clean, minimal auth page. Similar to Vercel or Linear login.
No distracting elements. Fast loading feel.
Mobile: full-width card, no sidebar.
```

#### 5.2 Checkout (Stripe)

```
PROMPT:

Design a web wireframe for a subscription checkout page for a construction SaaS.
Stripe-powered checkout experience. Enterprise theme.

Layout (2 columns on desktop, stacked on mobile):
- Left column (60%): "Choose Your Plan"
  App selector tabs: "Timekeeper" (active) | "Calculator" | "Bundle"

  Plan cards (2 side by side):
    FREE plan:
      "Timekeeper Free"
      "$0/month"
      Features: "✓ Manual time entry", "✓ 1 jobsite", "✓ Basic reports"
      Missing: "✗ GPS auto clock-in", "✗ Team sharing", "✗ Voice commands"
      [Current Plan] gray button (disabled)

    PRO plan (green border, "POPULAR" badge):
      "Timekeeper Pro"
      "$9.99/month" (or "$99/year — Save 17%")
      Toggle: Monthly | Annual
      Features: "✓ Everything in Free", "✓ GPS auto clock-in/out",
      "✓ Unlimited jobsites", "✓ Team sharing (QR)", "✓ Voice commands",
      "✓ PDF/CSV export", "✓ Priority support"
      [Subscribe] green button (#0F766E)

- Right column (40%): "Order Summary" (sticky card):
  "Timekeeper Pro — Annual"
  "Subtotal: $99.00/year"
  "Tax (Ontario 13% HST): $12.87"
  "Total: $111.87/year"
  Promo code input: "Have a code?" expandable
  ──
  Stripe payment element (card input)
  [Pay $111.87] large green button
  "🔒 Secured by Stripe" + lock icon
  "30-day money-back guarantee"

Professional checkout. Trust signals prominent.
Similar to Notion or Figma checkout pages.
```

#### 5.3 Subscription Management

```
PROMPT:

Design a web wireframe for a subscription management page.
Users manage their active subscriptions across multiple construction apps.

Layout (centered, max-width 800px):
- Header: "My Subscriptions" + user email
- Active Subscription card (green left border):
  "Timekeeper Pro — Annual"
  "Next billing: March 24, 2026 — $99.00/year"
  Status: green "ACTIVE" badge
  [Change Plan] [Cancel Subscription] buttons (outline, subtle)
- Inactive apps section: "Explore More Apps"
  Card: "Calculator Pro — $4.99/month" + [Subscribe] button
  Card: "Bundle (All Apps) — $14.99/month" + [Subscribe] button
- Payment Method section:
  "Visa ending in 4242" + card icon + [Update] link
- Billing History section:
  Table: Date | Description | Amount | Status | Invoice
  "Feb 24, 2026 | Timekeeper Pro | $99.00 | ✓ Paid | [PDF]"
  "Feb 24, 2025 | Timekeeper Pro | $89.00 | ✓ Paid | [PDF]"

Clean subscription management. Similar to Stripe Customer Portal.
```

---

## 6. SHOP — Web App (Next.js)

### Contexto
Shop e o **e-commerce de construcao** do OnSite Club. Vende roupas,
equipamentos, e acessorios para trabalhadores da construcao.
"Wear what you do!" — identidade de trade (Carpenter, Framer, etc.)
estampada nos produtos. Integrado com Stripe.

### Telas

#### 6.1 Store Home

```
PROMPT:

Design a web wireframe for a construction workwear e-commerce store.
Brand: "OnSite Club — Wear what you do!" Canadian construction industry.
Clean, modern, professional — NOT a generic fashion store.

Layout:
- Top nav bar (full width, white):
  Logo "OnSite Club" | Search bar | [Cart (2)] icon | [Account] icon
  Sub-nav: "All" | "Hoodies" | "T-Shirts" | "Caps" | "Safety Gear" | "Accessories"

- Hero banner (full width):
  Background: construction site photo (blurred)
  Overlay text: "WEAR WHAT YOU DO"
  Subtitle: "Workwear designed by tradespeople, for tradespeople"
  [Shop Now] green button (#0F766E)

- Section: "Shop by Trade" (horizontal scroll of cards):
  [🔨 Carpenter] [🏗 Framer] [⚡ Electrician] [🔧 Plumber] [🏠 Roofer] [General]
  Each card: icon + trade name, subtle background image

- Section: "Featured Products" (4-column grid):
  Product card 1: "OnSite Carpenter Hoodie"
    Product image placeholder (hoodie with carpenter logo)
    "$59.99 CAD" | ⭐ 4.8 (23 reviews) | "S M L XL XXL"
    [Add to Cart] button
  Product card 2: "Framer's Daily T-Shirt"
    "$29.99 CAD" | "NEW" badge | sizes
  Product card 3: "Hard Hat — OnSite Edition"
    "$34.99 CAD" | "BESTSELLER" badge
  Product card 4: "Safety Vest — High Vis"
    "$24.99 CAD" | orange product image

- Section: "Why OnSite?"
  3 icons with text:
  🇨🇦 "Made for Canadian trades" | 💪 "Durable workwear" | 🚚 "Free shipping $75+"

- Footer: links, social media, "© 2026 OnSite Club Inc."

Professional e-commerce. Similar to Carhartt or Helly Hansen workwear sites.
NOT fast fashion — construction pride and identity.
```

#### 6.2 Product Detail

```
PROMPT:

Design a web wireframe for a construction workwear product detail page.
Professional e-commerce, enterprise theme.

Layout (2 columns):
- Left (55%): Product images
  Main image: large product photo (hoodie with carpenter trade design)
  Thumbnail row: 4 angle shots (front, back, detail, on-model)

- Right (45%): Product info
  Breadcrumb: "Shop > Hoodies > Carpenter Hoodie"
  "OnSite Carpenter Hoodie"
  ⭐⭐⭐⭐⭐ 4.8 (23 reviews) | "In Stock"
  "$59.99 CAD" (large, bold)
  Compare at: "$79.99" (strikethrough, subtle)

  Color selector: [Black (selected)] [Navy] [Forest Green]
  Size selector: [S] [M] [L (selected)] [XL] [XXL]
  Size guide link

  Quantity: [-] [1] [+]

  [ADD TO CART] large green button (full width)
  [♡ Add to Wishlist] ghost button

  "🚚 Free shipping on orders over $75"
  "↩️ 30-day returns"

  Accordion sections:
  [▼ Description]: "Premium heavyweight hoodie designed for the trades..."
  [► Materials]: "80% cotton, 20% polyester..."
  [► Size Guide]: table with measurements
  [► Reviews (23)]: star breakdown + recent reviews

- Below: "You May Also Like" — 4 product cards

Professional product page. Similar to Shopify premium themes.
```

#### 6.3 Cart + Checkout

```
PROMPT:

Design a web wireframe for a construction e-commerce shopping cart page.
Clean, conversion-optimized. Enterprise theme.

Layout:
- Header: "Your Cart (2 items)" + [Continue Shopping] link

- Cart items (full width table/card):
  Item 1: [Image] "OnSite Carpenter Hoodie — Black, L" | Qty: [1] | $59.99 | [🗑 Remove]
  Item 2: [Image] "Framer's Daily T-Shirt — Navy, XL" | Qty: [2] | $59.98 ($29.99 each) | [🗑]

- Right column (sticky):
  "Order Summary"
  Subtotal: $119.97
  Shipping: "FREE" (green)
  Estimated Tax (HST 13%): $15.60
  ──
  Total: "$135.57 CAD"
  Promo code: [Enter code] [Apply]

  [CHECKOUT] large green button
  Payment icons: Visa, Mastercard, Amex, Apple Pay

  "🔒 Secure checkout powered by Stripe"

Clean cart focused on conversion. Remove distractions.
```

---

## NOTAS PARA GERACAO

### Ferramentas Recomendadas
- **v0.dev** (Vercel) — Melhor para web wireframes com Tailwind/React
- **Figma AI** — Bom para layout profissional
- **Midjourney** — Melhor para visual/branding (nao wireframes)
- **Claude Artifacts** — Bom para HTML/wireframes rapidos

### Dicas
1. Gere primeiro em **low-fidelity** (preto e branco), depois aplique cores
2. Use o mesmo prompt base de design system para consistencia
3. Para mobile: especifique "Android Material Design 3" no prompt
4. Para web: especifique "Tailwind CSS, similar to [referencia]"
5. Gere variantes: "Show me 3 variations of this layout"

### Ordem Sugerida de Geracao
1. **Operator** — Mais urgente (ja tem skeleton, precisa refinar)
2. **Inspect** — Core do Eagle (checklist e fotos)
3. **Dashboard** — Hub web (ja parcial)
4. **Auth** — Simples mas importante (ja existe)
5. **Analytics** — Complexo (ja parcial)
6. **Shop** — Futuro (nenhuma pressa)

---

## 7. MINUTES — Integrado no Timekeeper (Mobile) + Monitor (Web)

### Contexto
OnSite Minutes NAO e um app separado. E uma funcionalidade de **gravacao de reuniao
+ geracao de ata com IA** que vive dentro de dois apps existentes:
- **Timekeeper (mobile)**: O supervisor grava reunioes no canteiro pelo celular
- **Monitor (web)**: O supervisor revisa, busca, e reenvia atas no escritorio

Fluxo: Gravar → Upload → Deepgram transcreve → GPT-4o-mini gera ata → PDF enviado
por email/SMS/WhatsApp → Evento criado na timeline do lot mencionado.

O usuario e treinado a dizer "Lot [numero], site [nome]" no inicio da reuniao
para que a IA roteie a ata pro lot correto automaticamente.

### 7.1 Timekeeper: Menu Entry + Meeting List

```
PROMPT:

Design an Android mobile wireframe for a meeting minutes feature inside a
construction time-tracking app. Accessed via hamburger menu item "Meeting Minutes".
Enterprise theme: #F6F7F9 bg, #0F766E green, #C58B1B amber.

Screen layout (Meeting Minutes main screen):
- Top: Back arrow + "Meeting Minutes" title
- Section 1: Large call-to-action card (green gradient bg #0F766E):
  Microphone icon (large, centered)
  "Start New Meeting"
  Subtitle: "Record, transcribe, and send minutes automatically"
  [🎙️ START RECORDING] large white button
- Section 2: "Recent Meetings" header with "See All" link
- Scrollable list of meeting cards:
  Card 1: "Meeting with Inspector — Lot 023"
    "Maple Ridge Phase 2" | "Today 10:30 AM" | "22 min"
    Status badge: green "SENT" with checkmark
    "Sent to: john.d@minto.ca via Email"
  Card 2: "Site Walk — Lots 012, 015, 018"
    "Maple Ridge Phase 2" | "Yesterday 2:15 PM" | "35 min"
    Status badge: green "SENT"
    "Sent to: carlos@caivan.ca via WhatsApp"
  Card 3: "Material Discussion"
    "Maple Ridge Phase 2" | "Feb 22" | "8 min"
    Status badge: amber "PROCESSING" with spinner
    "Transcribing..."
  Card 4: "Weekly Planning"
    "Cedar Park" | "Feb 20" | "45 min"
    Status badge: gray "DRAFT" — upload pending (offline)
    "Waiting for connection..."

Each card tappable to view ata detail.
Clean, minimal list. Supervisor-focused — no clutter.
Large touch targets for field use.
```

### 7.2 Timekeeper: Participant Selection (Pre-Recording)

```
PROMPT:

Design an Android mobile wireframe for selecting a meeting participant
before starting a recording. Construction meeting minutes feature.
Enterprise theme: #F6F7F9 bg, #0F766E green.

Screen layout:
- Top: Back arrow + "New Meeting"
- Section 1: "Who is this meeting with?" header
- Search bar: "Search contacts..." with search icon
- Section 2: "Recent Contacts" (3-4 contact cards):
  Card: Avatar circle + "John Davidson" + "Inspector — City of Ottawa"
    "john.d@ottawa.ca" | "📧 Email" preferred channel badge
  Card: Avatar + "Carlos Mendes" + "Foreman — Caivan"
    "carlos@caivan.ca" | "💬 WhatsApp" preferred channel badge
  Card: Avatar + "Maria Santos" + "Supplier — Timber Mart"
    "+1 613-555-0123" | "📱 SMS" preferred channel badge
- Section 3: Divider + "Or add new contact"
  Row: [+ Add Email] [+ Add Phone] [+ Add WhatsApp]
  Each opens inline input field

- Bottom (sticky): Selected contact shown as chip:
  "John Davidson ✕" + delivery channel: [📧 Email (default)] dropdown
  Large green button: [🎙️ START RECORDING] (full width, #0F766E)

Simple contact picker. 2 taps to start: pick person → record.
Contacts are private to the supervisor (mnt_contacts table).
NOT linked to core_profiles — external people (inspectors, suppliers).
```

### 7.3 Timekeeper: Active Recording Screen

```
PROMPT:

Design an Android mobile wireframe for an active meeting recording screen.
Construction site meeting recorder. Must be minimal — supervisor puts phone
in pocket or on table and talks normally.
Enterprise theme: dark background for recording state.

Screen layout:
- Background: #101828 (dark) — indicates recording is active
- Top: "Recording..." text (white) + red pulsing dot
  "Meeting with John Davidson"
  "Lot context: say the lot number during the conversation"
- Center: Large timer display (white, monospace):
  "00:22:45" (hours:minutes:seconds)
  Below: Audio waveform visualization (subtle green #0F766E, animated)
- Bottom section:
  [⏸ PAUSE] circular button (amber, 64dp)
  [⏹ END MEETING] large red button (full width, below pause)
  Safety text: "Audio is saved locally. Will upload when connected."
- Very bottom: Subtle info:
  "📶 Online — will process immediately" OR
  "📵 Offline — will upload when connected"

CRITICAL: This screen must be visible at a glance from across a table.
Large timer, clear recording state, obvious stop button.
Works in bright sunlight (dark bg with high contrast text).
Minimal UI — the meeting is the focus, not the app.
```

### 7.4 Timekeeper: Processing Status

```
PROMPT:

Design an Android mobile wireframe for a meeting processing status screen
shown after the supervisor ends a recording. Construction meeting minutes.
Enterprise theme: #F6F7F9 bg, #0F766E green accent.

Screen layout:
- Top: "Processing Meeting" header
- Section 1: Meeting info card:
  "Meeting with John Davidson"
  "Duration: 22 min 45 sec" | "Feb 24, 2026 at 10:30 AM"
  "Site: Maple Ridge Phase 2"

- Section 2: Processing pipeline (vertical stepper):
  ✅ Step 1: "Audio uploaded" — "Completed" (green, checkmark)
  🔄 Step 2: "Transcribing audio..." — "In progress" (spinner, amber)
     Subtitle: "Deepgram AI — noise cancellation + speaker detection"
  ⬜ Step 3: "Generating minutes" — "Waiting" (gray)
     Subtitle: "AI will extract topics, decisions, and action items"
  ⬜ Step 4: "Creating PDF" — "Waiting"
  ⬜ Step 5: "Sending to participant" — "Waiting"
     Subtitle: "Will send to john.d@ottawa.ca via Email"

- Bottom: "You can close this screen — we'll notify you when ready."
  [🔔 Notify Me] toggle (on by default)
  [← Back to Home] ghost button

Patient, reassuring screen. Supervisor knows it's working.
Estimated time shown when available: "~3 minutes remaining"
Push notification when done.
```

### 7.5 Timekeeper: Meeting Detail (Ata View)

```
PROMPT:

Design an Android mobile wireframe for viewing a completed meeting minutes document
on a phone. Construction meeting minutes feature.
Enterprise theme: #F6F7F9 bg, #0F766E green.

Screen layout:
- Top: Back arrow + "Meeting Minutes" + share icon (top right)
- Header card (white):
  "Meeting with John Davidson"
  "Inspector — City of Ottawa"
  "Feb 24, 2026 | 10:30 AM — 10:53 AM | 22 min"
  "Maple Ridge Phase 2 — Lots 023, 015"
  Delivery status: "✅ Sent via Email at 10:58 AM"

- Tab bar: Minutes | Transcript | Audio

[MINUTES TAB shown]:
- Section: "📋 Topics Discussed" (expandable):
  1. "Frame check results for Lot 023"
     "Inspector noted 2 items failed: RA03 (multi-ply trusses) and MW07
     (sheathing gaps). Needs correction before re-inspection."
  2. "Steel post delivery timeline for Lot 015"
     "4 posts ordered, expected delivery March 1. Installer confirmed
     availability for March 3-4."
  3. "City framing inspection scheduling"
     "Inspector will return March 5 for Lots 023 and 018."

- Section: "✅ Decisions Made":
  • "Carlos to fix RA03 and MW07 on Lot 023 by Feb 28"
  • "Steel post installation scheduled for March 3-4"
  • "Re-inspection booked for March 5"

- Section: "📌 Action Items":
  Item 1: "Fix multi-ply truss nailing — Lot 023"
    Assigned: Carlos M. | Deadline: Feb 28 | 🔗 Linked to timeline
  Item 2: "Confirm steel post delivery — Lot 015"
    Assigned: Operator | Deadline: March 1
  Item 3: "Schedule re-inspection — Lots 023, 018"
    Assigned: Cristony | Deadline: March 4

- Bottom action bar:
  [📄 Download PDF] [📤 Resend] [🔗 Open in Timeline]

Structured, scannable meeting minutes on mobile.
Each action item is tappable and linked to the timeline event.
```

### 7.6 Monitor: Minutes Tab (Site-Level)

```
PROMPT:

Design a desktop web wireframe for a meeting minutes management tab within a
construction project management dashboard. This is a tab inside a site detail page,
alongside Lots, Schedule, Timeline, Team, Documents, Payments tabs.
Enterprise theme: #F6F7F9 bg, #0F766E green, Tailwind CSS aesthetic.

Layout (main content area, sidebar already present):
- Tab header: "Minutes" with badge count "23 meetings"
- Filter bar:
  Date range picker | Search input "Search in minutes..." |
  Participant dropdown | Lot filter dropdown | Status filter (All/Sent/Processing/Draft)

- Stats row (4 cards):
  "Total Meetings": "23" | "This Month": "8" | "Total Hours Recorded": "12h 45m" |
  "Action Items Open": "5" (amber)

- Main content: Table/list of meetings:
  Columns: Date | Participant | Duration | Lots Mentioned | Status | Actions

  Row 1: "Feb 24, 10:30 AM" | "John Davidson (Inspector)" | "22 min" |
    [Lot 023] [Lot 015] (clickable chips) | ✅ "Sent (Email)" |
    [📄 PDF] [👁 View] [📤 Resend]

  Row 2: "Feb 23, 2:15 PM" | "Carlos Mendes (Foreman)" | "35 min" |
    [Lot 012] [Lot 015] [Lot 018] | ✅ "Sent (WhatsApp)" |
    [📄 PDF] [👁 View] [📤 Resend]

  Row 3: "Feb 22, 9:00 AM" | "Maria Santos (Supplier)" | "8 min" |
    (no lots) | ✅ "Sent (SMS)" |
    [📄 PDF] [👁 View] [📤 Resend]

  Row 4: "Feb 20, 3:00 PM" | "Team Weekly" | "45 min" |
    [Lot 008] [Lot 009] [Lot 010] | ✅ "Sent (Email)" |
    [📄 PDF] [👁 View] [📤 Resend]

  Pagination at bottom

- Clicking a lot chip navigates to that lot's detail page
- Clicking "View" opens a side panel with full minutes + transcript

Professional data table. Clean, searchable, filterable.
Similar to Notion database view or Linear issue list.
1440px viewport, fits alongside the site detail sidebar.
```

### 7.7 Monitor: Meeting Detail (Side Panel / Modal)

```
PROMPT:

Design a desktop web wireframe for a meeting detail side panel (slide-in from right,
60% viewport width) within a construction project management dashboard.
Shows the full meeting minutes with tabs for structured view and raw transcript.
Enterprise theme: #F6F7F9 bg, #0F766E green, Tailwind CSS.

Side panel layout:
- Top: "Meeting Minutes" + close button (X)
- Header:
  "Meeting with John Davidson"
  "Inspector — City of Ottawa"
  "February 24, 2026 | 10:30 — 10:53 AM | 22 minutes"
  Delivery: "✅ Sent via Email to john.d@ottawa.ca at 10:58 AM"
  Lots: [Lot 023 — Fairbank 3D] [Lot 015 — Quinton 5D] (clickable links)

- Tab bar: Summary | Full Transcript | Audio | Actions

[SUMMARY TAB shown]:
  "Topics Discussed" section:
    1. Frame check results — Lot 023
       "Inspector noted 2 failed items: RA03 and MW07. Needs correction."
    2. Steel post delivery — Lot 015
       "4 posts ordered, delivery expected March 1."
    3. City framing inspection scheduling
       "Inspector returns March 5 for Lots 023 and 018."

  "Decisions" section (green left border):
    • Carlos to fix RA03 + MW07 on Lot 023 by Feb 28
    • Steel post installation: March 3-4
    • Re-inspection: March 5

  "Action Items" section (cards):
    Card: "Fix multi-ply truss nailing"
      Lot 023 | Carlos M. | Due: Feb 28
      Status: [Open ▼] dropdown
      "🔗 View in Lot 023 Timeline"
    Card: "Confirm steel post delivery"
      Lot 015 | Operator | Due: March 1
      Status: [Open ▼]
    Card: "Schedule re-inspection"
      Lots 023, 018 | Cristony | Due: March 4
      Status: [Completed ✓]

[FULL TRANSCRIPT TAB hint]:
  Diarized transcript with speaker labels:
    "SPEAKER 1 (Cristony): So John, let's start with Lot 023..."
    "SPEAKER 2 (John D.): Yes, I found two issues during the frame check..."
  Color-coded by speaker. Timestamps on left margin.

[AUDIO TAB hint]:
  Audio player with waveform, playback speed control (1x/1.5x/2x)
  Clicking a transcript segment jumps to that audio position

- Bottom action bar:
  [📄 Download PDF] [📤 Resend to Participant] [✏️ Edit Minutes]
  [🗑 Delete] (red, with confirmation)

Rich detail panel. Supervisor reviews and manages from desktop.
Action items are editable and trackable.
```

### 7.8 Monitor: Minutes in Lot Timeline

```
PROMPT:

Design a desktop web wireframe showing how a meeting minutes event appears
within a construction lot timeline feed. The timeline already has photo events,
status changes, material deliveries, etc. This shows the meeting minutes entry.
Enterprise theme: #F6F7F9 bg, WhatsApp-style timeline on web.

Timeline feed (within lot detail page):
- Existing events above and below for context:

  [Photo event - normal]:
  📷 Carlos M. — 10:15 AM
  "North wall framing complete" [photo thumbnail]

  [Meeting Minutes event - NEW, distinct styling]:
  🎙️ Meeting Minutes — 10:58 AM
  ┌─────────────────────────────────────────────────┐
  │  📋 Meeting with John Davidson (Inspector)       │
  │  Duration: 22 min | Feb 24, 10:30 AM             │
  │                                                   │
  │  Key Points:                                      │
  │  • RA03 + MW07 failed — needs correction by Feb 28│
  │  • Steel posts delivery: March 1                  │
  │  • Re-inspection: March 5                         │
  │                                                   │
  │  Action Items: 3 (2 open, 1 done)                │
  │                                                   │
  │  [📄 View Full Minutes] [📄 Download PDF]         │
  └─────────────────────────────────────────────────┘

  [Status change event - normal]:
  🔄 System — 11:00 AM
  "Phase status changed: framecheck → wire"

  [Material event - normal]:
  📦 Operator Mike T. — 11:15 AM
  "Steel Posts x4 delivered"

The meeting minutes event should be visually distinct (slightly larger card,
document icon, amber/blue accent border) but still feel part of the timeline.
Clicking "View Full Minutes" opens the side panel from prompt 7.7.

Shows how minutes integrate naturally into the existing timeline flow.
One lot can have multiple meeting references if discussed in different meetings.
```
