"use client";
import { useState, useEffect } from "react";

const C = {
  bg: "#FAFAF8", bgCard: "#FFFFFF", border: "#E8E5DD",
  amber: "#F5A623", amberLight: "#FCC747", amberDark: "#D4891A", amberBg: "#FEF9ED",
  dark: "#1A1A1A", green: "#2BA84A", blue: "#2563EB", purple: "#7C3AED",
  cyan: "#0891B2", red: "#DC2626", pink: "#DB2777", teal: "#0D9488", indigo: "#4F46E5",
  text: "#1A1A1A", textSec: "#5C5C5C", textMuted: "#9CA3AF",
  supabase: "#3ECF8E", supabaseBg: "#ECFDF5", planned: "#9CA3AF",
};

const fnt = "'JetBrains Mono', monospace";

const STATUS_CFG = {
  live: { label: "LIVE", bg: "#2BA84A", color: "#fff" },
  beta: { label: "BETA", bg: "#F5A623", color: "#fff" },
  dev:  { label: "DEV",  bg: "#2563EB", color: "#fff" },
  planned: { label: "TBD", bg: "#9CA3AF", color: "#fff" },
};

const EXTERNAL = [
  { id: "site", name: "OnSite Site", sub: "landing page", icon: "\u{1F310}" },
  { id: "shop", name: "OnSite Shop", sub: "e-commerce", icon: "\u{1F6D2}" },
  { id: "academy", name: "OnSite Academy", sub: "cursos & carreira", icon: "\u{1F393}" },
];

const ROWS = [
  { label: "NEXT.JS", version: "React 19 \u00B7 Next 16.1.6", color: C.blue, apps: [
    { id: "monitor", name: "Monitor", sub: "foreman", color: C.amber,
      deps: ["shared","ui","auth","ai","agenda","media","timeline","sharing"],
      desc: "Supervis\u00E3o de obra em tempo real", tech: "8 pkgs \u00B7 konva, ai, openai",
      progress: 75, status: "live",
      investor: "O Monitor \u00E9 o centro de comando digital da obra. Mostra em tempo real o progresso de cada casa sendo constru\u00EDda \u2014 quais est\u00E3o no prazo, quais atrasaram, e por qu\u00EA. Pense nele como um \u2018Google Maps\u2019 da constru\u00E7\u00E3o: o supervisor v\u00EA um mapa interativo com todas as casas e clica em qualquer uma para ver fotos, checklist de inspe\u00E7\u00E3o e timeline de eventos. Substitui planilhas Excel e comunica\u00E7\u00E3o por WhatsApp.",
      dev: { stack: "Next.js 16.1.6 \u00B7 React 19 \u00B7 TypeScript 5.x", pipeline: "Vercel \u00B7 Git push \u2192 auto-deploy \u00B7 Preview per PR", entry: "apps/monitor/src/app/site/[id]/page.tsx", port: 3000, notes: "App principal. Usa Konva.js para mapa SVG interativo. Integra\u00E7\u00E3o OpenAI para valida\u00E7\u00E3o de fotos via Claude Vision." },
      screens: [
        { name: "Dashboard", desc: "Mapa do loteamento com casas coloridas por status" },
        { name: "Casa Detail", desc: "Timeline de eventos + galeria de fotos + checklist" },
        { name: "Inspe\u00E7\u00E3o AI", desc: "Upload de fotos com valida\u00E7\u00E3o AI em tempo real" },
        { name: "Agenda", desc: "Cronograma de fases por casa com depend\u00EAncias" },
      ],
    },
    { id: "analytics", name: "Analytics", sub: "admin", color: C.blue,
      deps: ["supabase","utils","hooks"],
      desc: "Dashboards de KPIs e m\u00E9tricas", tech: "3 pkgs \u00B7 recharts, xlsx",
      progress: 60, status: "live",
      investor: "O Analytics \u00E9 o \u2018painel de controle\u2019 do neg\u00F3cio. Mostra em tempo real quantos usu\u00E1rios est\u00E3o ativos, quanto est\u00E3o pagando, quais apps s\u00E3o mais usados, e onde est\u00E3o os problemas. Permite tomar decis\u00F5es baseadas em dados reais, n\u00E3o em achismo.",
      dev: { stack: "Next.js 16.1.6 \u00B7 React 19 \u00B7 Recharts", pipeline: "Vercel \u00B7 auto-deploy", entry: "apps/analytics/src/app/page.tsx", port: 3010, notes: "Dashboards com Recharts. Consome views Supabase (v_mrr, v_churn_risk, v_user_health). Export Excel via xlsx." },
      screens: [
        { name: "KPIs Overview", desc: "M\u00E9tricas principais: MRR, usu\u00E1rios, churn" },
        { name: "Cohort Analysis", desc: "Reten\u00E7\u00E3o por coorte semanal/mensal" },
        { name: "Revenue", desc: "Receita por app, prov\u00EDncia e plano" },
      ],
    },
    { id: "dashboard", name: "Dashboard", sub: "club hub", color: C.purple,
      deps: ["supabase","utils"],
      desc: "\u00C1rea de membros OnSite Club", tech: "2 pkgs \u00B7 stripe",
      progress: 40, status: "live",
      investor: "O Dashboard \u00E9 a \u00E1rea de membros do OnSite Club. Onde construtores gerenciam sua assinatura, acessam conte\u00FAdos exclusivos e conectam-se com outros profissionais. Pense como um \u2018portal do cliente\u2019 para empresas de constru\u00E7\u00E3o.",
      dev: { stack: "Next.js 16.1.6 \u00B7 React 19 \u00B7 Stripe", pipeline: "Vercel \u00B7 auto-deploy", entry: "apps/dashboard/src/app/page.tsx", port: 3020, notes: "Integra\u00E7\u00E3o Stripe para billing. Usa @onsite/supabase para SSR auth." },
      screens: [
        { name: "Members", desc: "Lista de membros e status de assinatura" },
        { name: "Plans", desc: "Planos dispon\u00EDveis com pre\u00E7os" },
        { name: "Settings", desc: "Configura\u00E7\u00F5es da conta e billing" },
      ],
    },
    { id: "auth-app", name: "Auth", sub: "login", color: C.cyan,
      deps: ["supabase"],
      desc: "Hub de autentica\u00E7\u00E3o", tech: "1 pkg \u00B7 stripe",
      progress: 90, status: "live",
      investor: "O Auth \u00E9 a \u2018porta de entrada\u2019 de todos os apps. Gerencia login, cadastro, recupera\u00E7\u00E3o de senha e verifica\u00E7\u00E3o de identidade. Um \u00FAnico login funciona em todos os apps do ecossistema \u2014 assim como Google ou Apple ID.",
      dev: { stack: "Next.js 16.1.6 \u00B7 React 19 \u00B7 Supabase Auth", pipeline: "Vercel \u00B7 auto-deploy", entry: "apps/auth/src/app/page.tsx", port: 3030, notes: "Supabase Auth com magic link + password. Redirect flow para todos os apps. Shared session via cookies." },
      screens: [
        { name: "Login", desc: "Email + senha ou magic link" },
        { name: "Signup", desc: "Cadastro com sele\u00E7\u00E3o de trade" },
        { name: "Reset Password", desc: "Recupera\u00E7\u00E3o de senha por email" },
      ],
    },
    { id: "sheets", name: "Sheets", sub: "jobsite ctrl", color: C.teal,
      deps: ["shared"],
      desc: "Planilhas de controle de obra (Avalon)", tech: "1 pkg", isNew: true,
      progress: 25, status: "dev",
      investor: "O Sheets digitaliza as planilhas de controle de obra usadas diariamente por supervisores. Substitui o Excel por uma interface web colaborativa que todos no canteiro podem acessar. Baseado em planilhas reais do projeto Avalon (65 lotes).",
      dev: { stack: "Next.js 16.1.6 \u00B7 React 19 \u00B7 TypeScript", pipeline: "Vercel \u00B7 auto-deploy", entry: "apps/sheets/src/app/page.tsx", port: 3040, notes: "Baseado na planilha Avalon CONTROL.xlsx (13 abas). Dados reais de 65 lotes do projeto The Ridge Stage 1." },
      screens: [
        { name: "Planilha Vista", desc: "Grid editável estilo Excel com dados de obra" },
        { name: "Lot Detail", desc: "Detalhes de cada lote: fases, workers, status" },
      ],
    },
    { id: "payments", name: "Payments", sub: "financeiro", color: C.teal,
      deps: ["supabase","auth","shared","hooks","utils"],
      desc: "Pagamentos por casa/lote \u2192 QuickBooks", tech: "5 pkgs", isNew: true,
      progress: 10, status: "dev",
      investor: "O Payments automatiza o controle financeiro da obra. Calcula o que cada subcontratado deve receber por lote baseado no metragem (sqft), gera faturas e integra com QuickBooks para contabilidade. Elimina planilhas manuais de pagamento.",
      dev: { stack: "Next.js 16.1.6 \u00B7 React 19 \u00B7 QuickBooks API", pipeline: "Vercel \u00B7 auto-deploy", entry: "apps/payments/src/app/page.tsx", port: 3050, notes: "Billing por sqft. Integra\u00E7\u00E3o QuickBooks Online. Usa egl_houses.sqft_total para c\u00E1lculo." },
      screens: [
        { name: "Invoice List", desc: "Lista de faturas por per\u00EDodo e worker" },
        { name: "Payment Detail", desc: "Detalhe da fatura com c\u00E1lculos por sqft" },
      ],
    },
  ]},
  { label: "EXPO / RN", version: "React 18.3.1 \u00B7 Expo 52", color: C.green, apps: [
    { id: "timekeeper", name: "Timekeeper", sub: "worker", color: C.green,
      deps: ["shared","ui","tokens","agenda","media","timeline","offline"],
      desc: "Ponto com geofencing GPS", tech: "7 pkgs \u00B7 GPS, offline",
      progress: 85, status: "live",
      investor: "O Timekeeper \u00E9 o app que os trabalhadores usam no celular para registrar suas horas de trabalho automaticamente. Quando o trabalhador chega no canteiro, o GPS detecta e marca o ponto. Quando sai, marca a sa\u00EDda. Sem papel, sem rel\u00F3gio de ponto, sem fraude. Gera relat\u00F3rios exportáveis.",
      dev: { stack: "Expo 52 \u00B7 React Native 0.76 \u00B7 React 18.3.1", pipeline: "EAS Build \u00B7 Android APK via USB \u00B7 Dev client", entry: "apps/timekeeper/app/(tabs)/index.tsx", port: 8081, notes: "Background geolocation com expo-location. SQLite local + sync offline. Metro blockList para isolamento React 18/19." },
      screens: [
        { name: "Clock In/Out", desc: "Tela principal com bot\u00E3o de ponto e timer" },
        { name: "Hist\u00F3rico", desc: "Lista de entradas com filtros por per\u00EDodo" },
        { name: "Locations", desc: "Mapa com geofences configuradas" },
        { name: "Projetos", desc: "Lista de projetos com horas acumuladas" },
      ],
    },
    { id: "operator", name: "Operator", sub: "m\u00E1quina", color: C.amberDark,
      deps: ["shared","auth","camera","timeline","sharing","offline"],
      desc: "Equipamentos + c\u00E2mera + QR", tech: "6 pkgs",
      progress: 70, status: "live",
      investor: "O Operator \u00E9 o app para operadores de equipamentos pesados e entregas no canteiro. Permite registrar pedidos de material, reportar problemas com fotos, e escanear QR codes de equipamentos. Substitui r\u00E1dios e anota\u00E7\u00F5es em papel.",
      dev: { stack: "Expo 52 \u00B7 React Native 0.76 \u00B7 React 18.3.1", pipeline: "EAS Build \u00B7 Android via USB \u00B7 Dev client", entry: "apps/operator/app/(tabs)/index.tsx", port: 8081, notes: "3 tabs: Pedidos, Reportar, Config. Camera nativa via @onsite/camera. Offline queue via @onsite/offline. watchFolders = only needed packages." },
      screens: [
        { name: "Pedidos", desc: "Lista de pedidos de material com status" },
        { name: "Reportar", desc: "Report de problemas com foto e descri\u00E7\u00E3o" },
        { name: "Config", desc: "Configura\u00E7\u00F5es do usu\u00E1rio e sync" },
      ],
    },
    { id: "field", name: "Field", sub: "foto ops", color: C.red,
      deps: ["shared","ui","auth"],
      desc: "Registro fotogr\u00E1fico de obra", tech: "3 pkgs",
      progress: 55, status: "live",
      investor: "O Field \u00E9 o app de registro fotogr\u00E1fico. Trabalhadores fotografam cada fase da obra com o celular, e as fotos ficam organizadas por lote, fase e data automaticamente. Cria um hist\u00F3rico visual completo de cada casa constru\u00EDda \u2014 essencial para disputas e garantias.",
      dev: { stack: "Expo 52 \u00B7 React Native 0.76 \u00B7 React 18.3.1", pipeline: "EAS Build \u00B7 Android via USB", entry: "apps/field/app/(tabs)/index.tsx", port: 8081, notes: "Camera nativa. Upload para Supabase Storage (egl-media bucket). Fotos organizadas por site_id/lot_id." },
      screens: [
        { name: "Lots Grid", desc: "Grade de lotes com thumbnail da \u00FAltima foto" },
        { name: "Lot Photos", desc: "Galeria de fotos por fase com timeline" },
        { name: "Camera", desc: "Captura com metadata autom\u00E1tica (GPS, data)" },
      ],
    },
    { id: "inspect", name: "Inspect", sub: "inspetor", color: C.pink,
      deps: ["shared","ui","auth"],
      desc: "Inspe\u00E7\u00F5es e checklists", tech: "3 pkgs",
      progress: 45, status: "live",
      investor: "O Inspect \u00E9 o app para inspetores de obra. Permite fazer inspe\u00E7\u00F5es digitais com checklist de 140+ itens, tirar fotos dos problemas encontrados e gerar relat\u00F3rios automaticamente. Substitui pranchetas e formul\u00E1rios em papel.",
      dev: { stack: "Expo 52 \u00B7 React Native 0.76 \u00B7 React 18.3.1", pipeline: "EAS Build \u00B7 Android via USB", entry: "apps/inspect/app/(app)/index.tsx", port: 8081, notes: "Checklist baseado em ref_eagle_phase_items (140 itens codificados: RA01-RA23, SF01-SF17, etc). Scanner QR para identificar lote." },
      screens: [
        { name: "Checklist", desc: "Inspe\u00E7\u00E3o item por item com fotos" },
        { name: "House Scan", desc: "Scanner QR code do lote" },
        { name: "Submit", desc: "Revis\u00E3o e envio do relat\u00F3rio" },
      ],
    },
  ]},
  { label: "CAPACITOR", version: "Vite 5.4 \u00B7 Ionic", color: C.indigo, apps: [
    { id: "calculator", name: "Calculator", sub: "c\u00E1lculos", color: C.indigo,
      deps: ["shared","voice","utils"],
      desc: "Calculadora de constru\u00E7\u00E3o com voz", tech: "3 pkgs \u00B7 voice",
      progress: 80, status: "live",
      investor: "O Calculator \u00E9 uma calculadora especializada para constru\u00E7\u00E3o que aceita comandos de voz. O trabalhador fala \u2018quanto material preciso para uma parede de 8 p\u00E9s por 12 p\u00E9s?\u2019 e recebe a resposta instant\u00E2nea. Inclui conversores de unidades e c\u00E1lculos de escadas/telhados.",
      dev: { stack: "Vite 5.4 \u00B7 Capacitor 6.1 \u00B7 React 18.3.1", pipeline: "Codemagic CI \u00B7 Android APK + iOS IPA", entry: "apps/calculator/src/App.tsx", port: 5173, notes: "PWA + Capacitor. Voice via Web Speech API + fallback Whisper. Sem Supabase auth (anon usage). Rate limiting via edge function." },
      screens: [
        { name: "Calculadora", desc: "Interface principal com display e bot\u00F5es" },
        { name: "Conversor", desc: "Convers\u00E3o de unidades imperial/m\u00E9trico" },
        { name: "Escadas", desc: "C\u00E1lculo de escadas com visualiza\u00E7\u00E3o" },
        { name: "Tri\u00E2ngulo", desc: "C\u00E1lculos trigonom\u00E9tricos para telhados" },
      ],
    },
    { id: "sheetchat", name: "SheetChat", sub: "rede social", color: C.planned,
      deps: [], desc: "Twitter + LinkedIn da constru\u00E7\u00E3o", tech: "TBD", isPlanned: true,
      progress: 0, status: "planned",
      investor: "O SheetChat ser\u00E1 a rede social da constru\u00E7\u00E3o. Um app de mensagens com tradu\u00E7\u00E3o autom\u00E1tica (ingl\u00EAs, portugu\u00EAs, tagalog, espanhol) para equipes multiculturais. Integra\u00E7\u00E3o com todos os outros apps do ecossistema.",
      dev: { stack: "TBD", pipeline: "TBD", entry: "TBD", port: 0, notes: "Planejado. Sem repo ainda. Ver CLAUDE.md se\u00E7\u00E3o 5.6 para spec completa." },
      screens: [],
    },
  ]},
];

const PKGS = [
  { id: "shared", name: "shared", sub: "types", layer: "f", desc: "Tipos TypeScript compartilhados entre todos os apps e packages", users: ["monitor","analytics","dashboard","timekeeper","operator","field","inspect","calculator","payments","sheets"] },
  { id: "tokens", name: "tokens", sub: "design tokens", layer: "f", desc: "Design tokens: cores, tipografia, espa\u00E7amento. +tailwind adapter", users: ["timekeeper"] },
  { id: "logger", name: "logger", sub: "logs", layer: "f", desc: "Sistema de logging estruturado com 6+ tags", users: [] },
  { id: "auth", name: "auth", sub: "login", layer: "f", desc: "L\u00F3gica de autentica\u00E7\u00E3o compartilhada (pure JS core + React context)", users: ["monitor","operator","field","inspect","payments"] },
  { id: "utils", name: "utils", sub: "helpers", layer: "f", desc: "Utilit\u00E1rios: cn(), formatters, uuid. Sub-exports para mobile", users: ["analytics","dashboard","calculator","payments"] },
  { id: "ai", name: "ai", sub: "prumo", layer: "f", desc: "SDK do Prumo AI \u2014 integra\u00E7\u00E3o OpenAI, specialists", users: ["monitor"] },
  { id: "ui", name: "ui", sub: "web + native", layer: "f", desc: "Componentes UI cross-platform + theme/colors derivado de tokens", users: ["monitor","timekeeper","field","inspect"] },
  { id: "voice", name: "voice", sub: "audio", layer: "f", desc: "Reconhecimento e s\u00EDntese de voz", users: ["calculator"] },
  { id: "offline", name: "offline", sub: "queue", layer: "f", desc: "Fila offline com sync autom\u00E1tico", users: ["timekeeper","operator"] },
  { id: "supabase", name: "supabase", sub: "SSR client", layer: "f", desc: "Cliente Supabase para SSR (Next.js only): client, server, middleware", users: ["analytics","dashboard","auth-app","payments"] },
  { id: "timeline", name: "timeline", sub: "events", layer: "c", desc: "Timeline de eventos compartilhada (WhatsApp-style, AI-mediated)", users: ["monitor","timekeeper","operator"] },
  { id: "agenda", name: "agenda", sub: "scheduling", layer: "c", desc: "Sistema de agendamento: site-level + house-level", users: ["monitor","timekeeper"] },
  { id: "media", name: "media", sub: "uploads", layer: "c", desc: "Upload e gest\u00E3o de m\u00EDdia (R2/Supabase Storage)", users: ["monitor","timekeeper"] },
  { id: "camera", name: "camera", sub: "capture", layer: "c", desc: "Captura de c\u00E2mera nativa (Expo)", users: ["operator"] },
  { id: "hooks", name: "hooks", sub: "supabase", layer: "c", desc: "React hooks para Supabase: universal + web splits", users: ["analytics","payments"] },
  { id: "export", name: "export", sub: "files", layer: "c", desc: "Exporta\u00E7\u00E3o de dados (PDF, CSV, Excel)", users: [] },
  { id: "sharing", name: "sharing", sub: "QR links", layer: "c", desc: "Compartilhamento via QR code + access grants", users: ["monitor","operator"] },
];

/* \u2550\u2550\u2550 SCHEMA SNAPSHOT (fev 2026) \u2550\u2550\u2550 */
/* Formato por tabela: [nome, colunas, rows, descri\u00E7\u00E3o, alerta?] */
const SCHEMA_DATA = [
  { p: "core_", l: "Identidade & Sharing", d: "Perfis, dispositivos, orgs, consentimentos", cl: C.dark, t: [
    ["core_profiles", 47, 1, "Perfil 1:1 com auth.users. Trade, experi\u00EAncia, localiza\u00E7\u00E3o."],
    ["core_devices", 23, 0, "Dispositivos dos usu\u00E1rios. Push tokens, modelo, OS."],
    ["core_consents", 16, 0, "Consentimentos LGPD (9 tipos). Imut\u00E1vel, com hash."],
    ["core_organizations", 13, 0, "Empresas/construtoras \u2014 tenants do multi-tenancy."],
    ["core_org_memberships", 8, 0, "V\u00EDnculo N:N entre users e orgs com role."],
    ["core_access_grants", 9, 0, "Compartilhamento via QR code. Token + status."],
    ["core_pending_tokens", 6, 0, "Tokens QR pendentes (TTL 5min). SECURITY DEFINER."],
    ["core_admin_users", 12, 0, "Admins aprovados. Roles: admin, super_admin, analyst."],
    ["core_admin_logs", 9, 0, "Audit log de a\u00E7\u00F5es admin.", "USING(true)"],
    ["core_voice_logs", 40, 0, "Logs de voz: \u00E1udio, transcri\u00E7\u00E3o, NLP, qualidade."],
    ["core_ai_conversations", 8, 0, "Conversas com IA Prumo. Mensagens em JSONB."],
    ["core_pricing_tiers", 7, 0, "Pricing por sqft vinculado \u00E0 organiza\u00E7\u00E3o."],
  ]},
  { p: "egl_", l: "Eagle (Visual)", d: "Sites, casas, fotos, progresso, timeline, materiais", cl: C.amber, t: [
    ["egl_sites", 11, 0, "Loteamentos/canteiros. SVG do mapa, total de lotes."],
    ["egl_houses", 20, 0, "Casas/lotes. Status, fase atual, coordenadas, sqft."],
    ["egl_photos", 17, 0, "Fotos de fases. AI validation, metadata Prumo training."],
    ["egl_progress", 9, 0, "Progresso por casa\u00D7fase. Status de aprova\u00E7\u00E3o."],
    ["egl_timeline", 12, 2, "Timeline de eventos por casa. Multi-source."],
    ["egl_issues", 13, 0, "Issues reportados. Severidade, status, fotos."],
    ["egl_scans", 8, 0, "Scans de plantas. AI processing para SVG."],
    ["egl_messages", 10, 20, "Mensagens na timeline. AI-mediated."],
    ["egl_schedules", 18, 0, "Cronograma por casa. AI risk score.", "RLS OFF"],
    ["egl_schedule_phases", 13, 0, "Fases do cronograma. Depend\u00EAncias, bloqueios."],
    ["egl_external_events", 17, 4, "Eventos externos: clima, feriados, inspe\u00E7\u00E3o."],
    ["egl_documents", 12, 0, "Documentos por lote: plantas, RSO, red lines.", "ANON CRUD"],
    ["egl_document_batches", 8, 0, "Lotes de documentos agrupados.", "ANON CRUD"],
    ["egl_document_links", 6, 0, "Links entre documentos e entidades.", "ANON CRUD"],
    ["egl_material_requests", 30, 6, "Pedidos de material do Operator."],
    ["egl_material_request_items", 12, 0, "Itens dos pedidos de material."],
    ["egl_operator_assignments", 10, 1, "Atribui\u00E7\u00F5es de operadores a sites."],
    ["egl_app_registry", 8, 15, "Registro de apps do ecossistema Eagle."],
    ["egl_phase_assignments", 10, 0, "Worker por fase por casa (Avalon pattern)."],
    ["egl_phase_rates", 8, 0, "Rate $/sqft por fase."],
    ["egl_crews", 8, 0, "Equipes de campo (Frama, New York, etc)."],
    ["egl_crew_members", 6, 0, "Membros das equipes."],
    ["egl_material_tracking", 12, 0, "Pipeline materiais (ordered\u2192delivered\u2192installed)."],
  ]},
  { p: "tmk_", l: "Timekeeper (Horas)", d: "Entradas de ponto, geofences, projetos, sess\u00F5es", cl: C.green, t: [
    ["tmk_entries", 25, 0, "Entradas de ponto. GPS auto + manual. Soft delete."],
    ["tmk_geofences", 24, 0, "Geofences (locais de trabalho). Raio, coordenadas."],
    ["tmk_projects", 20, 0, "Projetos com estimativas de horas e or\u00E7amento."],
    ["tmk_sessions", 17, 0, "Sess\u00F5es de uso do app Timekeeper."],
    ["tmk_day_summary", 19, 0, "Resumo di\u00E1rio: horas, entradas, sync."],
    ["tmk_analytics", 20, 0, "Analytics de uso do Timekeeper."],
    ["tmk_audit", 13, 0, "Audit trail de edi\u00E7\u00F5es em entradas."],
    ["tmk_corrections", 13, 0, "Corre\u00E7\u00F5es manuais de ponto."],
    ["tmk_errors", 13, 0, "Erros capturados no app Timekeeper."],
    ["tmk_events", 14, 0, "Eventos de uso (feature tracking)."],
    ["tmk_config", 8, 0, "Configura\u00E7\u00F5es por usu\u00E1rio do Timekeeper."],
  ]},
  { p: "ccl_", l: "Calculator (Voz)", d: "C\u00E1lculos e templates de constru\u00E7\u00E3o", cl: C.indigo, t: [
    ["ccl_calculations", 16, 0, "C\u00E1lculos realizados. Input manual ou voz."],
    ["ccl_templates", 14, 0, "Templates de f\u00F3rmulas. Sistema + custom."],
  ]},
  { p: "bil_", l: "Billing", d: "Assinaturas Stripe, produtos, pagamentos", cl: C.blue, t: [
    ["bil_products", 14, 0, "Produtos/planos Stripe por app."],
    ["bil_subscriptions", 28, 0, "Assinaturas ativas. Stripe sync completo."],
    ["bil_payments", 21, 0, "Hist\u00F3rico de pagamentos com Stripe refs."],
    ["bil_checkout_codes", 8, 0, "C\u00F3digos de checkout tempor\u00E1rios."],
  ]},
  { p: "shp_", l: "Shop (E-commerce)", d: "Produtos, variantes, pedidos, carrinho", cl: C.pink, t: [
    ["shp_products", 27, 0, "Produtos da loja. SKU, pre\u00E7o, invent\u00E1rio."],
    ["shp_variants", 13, 0, "Variantes (tamanho, cor) por produto."],
    ["shp_categories", 10, 0, "Categorias hier\u00E1rquicas de produtos."],
    ["shp_orders", 23, 0, "Pedidos com Stripe payment intent."],
    ["shp_order_items", 12, 0, "Itens dos pedidos com pre\u00E7o unit\u00E1rio."],
    ["shp_carts", 8, 0, "Carrinhos com items JSONB e expira\u00E7\u00E3o."],
  ]},
  { p: "club_", l: "Club (Gamifica\u00E7\u00E3o)", d: "Badges, campanhas, streaks, not\u00EDcias", cl: C.purple, t: [
    ["club_badges", 14, 13, "Badges conquist\u00E1veis (achievements)."],
    ["club_user_badges", 6, 0, "Badges conquistados por usu\u00E1rio."],
    ["club_campaigns", 19, 0, "Campanhas de engajamento."],
    ["club_campaign_interactions", 6, 0, "Intera\u00E7\u00F5es em campanhas."],
    ["club_streaks", 8, 0, "Sequ\u00EAncias de uso (gamifica\u00E7\u00E3o)."],
    ["club_news", 16, 0, "Not\u00EDcias e announcements."],
    ["club_partner_offers", 18, 0, "Ofertas de parceiros."],
    ["club_partner_redemptions", 4, 0, "Resgates de ofertas."],
  ]},
  { p: "crd_", l: "Cards / Blades", d: "Cart\u00F5es, transa\u00E7\u00F5es, ledger, funding", cl: C.teal, t: [
    ["crd_cardholders", 15, 0, "Portadores de cart\u00E3o. KYC data."],
    ["crd_cards", 21, 0, "Cart\u00F5es emitidos. Status, limites."],
    ["crd_transactions", 19, 0, "Transa\u00E7\u00F5es com cart\u00E3o. MCC, merchant."],
    ["crd_blades_ledger", 9, 0, "Ledger do programa Blades (pontos)."],
    ["crd_funding_events", 11, 0, "Eventos de funding de cart\u00F5es."],
    ["crd_waitlist", 8, 0, "Waitlist para programa de cart\u00F5es."],
  ]},
  { p: "sht_", l: "Sheets (Controle)", d: "Exports, views salvas, QuickBooks", cl: C.teal, t: [
    ["sht_exports", 9, 0, "Exports de planilhas gerados."],
    ["sht_saved_views", 12, 0, "Views/filtros salvos."],
    ["sht_qb_mappings", 6, 0, "Mapeamento QuickBooks.", "USING(true)"],
  ]},
  { p: "ref_", l: "Refer\u00EAncia", d: "Lookup: trades, prov\u00EDncias, unidades, fases", cl: C.cyan, t: [
    ["ref_trades", 18, 0, "Trades (profiss\u00F5es). Multil\u00EDngue, categorias."],
    ["ref_provinces", 12, 0, "Prov\u00EDncias canadenses. Timezone, min wage."],
    ["ref_units", 13, 0, "Unidades de medida. Convers\u00E3o metric\u2194imperial."],
    ["ref_eagle_phases", 13, 0, "Fases de constru\u00E7\u00E3o (7 default)."],
    ["ref_eagle_phase_items", 8, 0, "Itens de checklist por fase (140 codificados)."],
    ["ref_material_types", 10, 0, "Tipos de material de constru\u00E7\u00E3o."],
  ]},
  { p: "log_", l: "Logs", d: "Erros, eventos de uso, localiza\u00E7\u00F5es GPS", cl: C.red, t: [
    ["log_errors", 17, 0, "Erros com stack trace, contexto e device."],
    ["log_events", 21, 0, "Eventos de uso para analytics."],
    ["log_locations", 18, 0, "Localiza\u00E7\u00F5es GPS com accuracy e geofence."],
  ]},
  { p: "agg_", l: "Agrega\u00E7\u00F5es", d: "M\u00E9tricas pr\u00E9-calculadas: plataforma, trades, usu\u00E1rios", cl: C.blue, t: [
    ["agg_platform_daily", 23, 0, "KPIs di\u00E1rios: users, entries, revenue, errors."],
    ["agg_trade_weekly", 17, 0, "M\u00E9tricas semanais por trade e prov\u00EDncia."],
    ["agg_user_daily", 32, 0, "Atividade di\u00E1ria por usu\u00E1rio. 32 colunas."],
  ]},
  { p: "int_", l: "Intelig\u00EAncia", d: "Padr\u00F5es, worker/lot profiles, AI reports", cl: C.purple, t: [
    ["int_behavior_patterns", 17, 0, "Padr\u00F5es de comportamento por segmento."],
    ["int_voice_patterns", 16, 0, "Padr\u00F5es de voz: termos, dialetos, varia\u00E7\u00F5es."],
    ["int_worker_profiles", 20, 0, "Perfis de worker: performance, qualidade."],
    ["int_lot_profiles", 18, 0, "Perfis de lote: dificuldade, terreno."],
    ["int_delay_attributions", 22, 0, "Atribui\u00E7\u00E3o de atrasos: causa raiz."],
    ["int_ai_reports", 18, 0, "Relat\u00F3rios AI gerados (weekly, monthly)."],
    ["int_ai_contestations", 16, 0, "Contesta\u00E7\u00F5es de conclus\u00F5es da IA."],
  ]},
];

const TECH_TABS = [
  { id: "data-flow", name: "Fluxo de Dados", icon: "\uD83D\uDD04", color: C.blue, summary: "29 rotas API \u00B7 SSR + direct \u00B7 polling model",
    menu: [{ id: "overview", l: "Vis\u00E3o Geral" }, { id: "routes", l: "Rotas API (29)" }, { id: "patterns", l: "Padr\u00F5es" }, { id: "gaps", l: "Gaps & TODO" }] },
  { id: "security", name: "Seguran\u00E7a", icon: "\uD83D\uDEE1\uFE0F", color: C.red, summary: "67 RLS policies \u00B7 5 roles \u00B7 SECURITY DEFINER",
    menu: [{ id: "overview", l: "Vis\u00E3o Geral" }, { id: "rls", l: "RLS Policies (67)" }, { id: "trust", l: "Trust Boundaries" }, { id: "gaps", l: "Gaps & TODO" }] },
  { id: "multi-tenant", name: "Multi-Tenancy", icon: "\uD83C\uDFE2", color: C.purple, summary: "14 tabelas \u00B7 4 helpers \u00B7 org_id pattern",
    menu: [{ id: "overview", l: "Vis\u00E3o Geral" }, { id: "coverage", l: "Cobertura (14)" }, { id: "helpers", l: "Helpers SQL" }, { id: "gaps", l: "Gaps & TODO" }] },
  { id: "lifecycle", name: "Ciclo de Vida", icon: "\u267B\uFE0F", color: C.green, summary: "9 consent types \u00B7 soft deletes \u00B7 retention",
    menu: [{ id: "overview", l: "Vis\u00E3o Geral" }, { id: "consent", l: "Consent (9 tipos)" }, { id: "retention", l: "Reten\u00E7\u00E3o & Cleanup" }, { id: "gaps", l: "Gaps & TODO" }] },
  { id: "observability", name: "Observabilidade", icon: "\uD83D\uDCCA", color: C.cyan, summary: "@onsite/logger \u00B7 Sentry (1/8) \u00B7 0 health checks",
    menu: [{ id: "overview", l: "Vis\u00E3o Geral" }, { id: "logger", l: "@onsite/logger" }, { id: "monitoring", l: "Monitoring" }, { id: "gaps", l: "Gaps & TODO" }] },
];

/* ═══ DATA MERGE (live data over hardcoded defaults) ═══ */

const RUNTIME_COLORS = { nextjs: C.blue, expo: C.green, capacitor: C.indigo, unknown: C.textMuted };

function mergeRows(rows, liveApps) {
  if (!liveApps?.length) return rows;
  const liveMap = new Map(liveApps.map(a => [a.app_slug, a]));
  const merged = rows.map(row => ({
    ...row,
    apps: row.apps.map(app => {
      const live = liveMap.get(app.id);
      if (!live) return app;
      liveMap.delete(app.id);
      return { ...app, deps: live.deps?.map(d => d.replace("@onsite/", "")) || app.deps };
    }),
  }));
  // Auto-add apps found in scan but not in ROWS
  const newApps = [];
  for (const [slug, live] of liveMap) {
    if (!slug || slug === "architecture") continue;
    newApps.push({
      id: slug, name: slug.charAt(0).toUpperCase() + slug.slice(1), sub: "auto-detected", color: RUNTIME_COLORS[live.runtime] || C.textMuted,
      deps: live.deps?.map(d => d.replace("@onsite/", "")) || [], desc: `App detectado: ${live.runtime}`, tech: `${live.deps?.length || 0} pkgs`,
      progress: 0, status: "dev", isAutoDetected: true,
      dev: { stack: live.runtime, pipeline: "desconhecido", entry: `apps/${slug}/`, port: live.port || 0, notes: "Auto-detectado pelo scanner." },
      screens: [],
    });
  }
  if (newApps.length > 0) {
    const runtimeRow = { nextjs: 0, expo: 1, capacitor: 2 };
    for (const app of newApps) {
      const live = liveApps.find(a => a.slug === app.id);
      const ri = runtimeRow[live?.runtime] ?? merged.length - 1;
      if (merged[ri]) merged[ri] = { ...merged[ri], apps: [...merged[ri].apps, app] };
    }
  }
  return merged;
}

function mergePkgs(pkgs, livePkgs) {
  if (!livePkgs?.length) return pkgs;
  const liveMap = new Map(livePkgs.map(p => [p.slug, p]));
  const merged = pkgs.map(pkg => {
    const live = liveMap.get(pkg.id);
    if (!live) return pkg;
    liveMap.delete(pkg.id);
    return { ...pkg, users: live.consumers?.length > 0 ? live.consumers.map(c => c.replace("@onsite/", "")) : pkg.users };
  });
  // Auto-add packages found in scan but not in PKGS
  for (const [slug, live] of liveMap) {
    merged.push({
      id: slug, name: slug, sub: live.layer || "auto", layer: live.layer === "foundation" ? "f" : "c",
      desc: `Package detectado automaticamente`, users: live.consumers?.map(c => c.replace("@onsite/", "")) || [],
      isAutoDetected: true,
    });
  }
  return merged;
}

function mergeSchema(schemaData, liveSchema) {
  if (!liveSchema?.groups || liveSchema.source === "static") return schemaData;
  // Build lookup of descriptions from hardcoded SCHEMA_DATA
  const descMap = new Map();
  const groupMeta = new Map();
  for (const g of schemaData) {
    groupMeta.set(g.p, { l: g.l, d: g.d, cl: g.cl });
    for (const t of g.t) descMap.set(t[0], { desc: t[3], alert: t[4] });
  }
  // Build policy analysis from live data
  const policyCount = new Map();
  const policyQuals = new Map();
  for (const p of (liveSchema.policies || [])) {
    policyCount.set(p.tablename, (policyCount.get(p.tablename) || 0) + 1);
    if (!policyQuals.has(p.tablename)) policyQuals.set(p.tablename, []);
    policyQuals.get(p.tablename).push(p.qual || "");
  }
  return liveSchema.groups.map(g => {
    const meta = groupMeta.get(g.prefix) || { l: g.prefix, d: "", cl: C.textMuted };
    return {
      p: g.prefix, l: meta.l, d: meta.d, cl: meta.cl,
      t: g.tables.map(t => {
        const known = descMap.get(t.table_name);
        const polCount = policyCount.get(t.table_name) || 0;
        const quals = policyQuals.get(t.table_name) || [];
        const hasTrueQual = quals.some(q => q.trim() === "true" || q.trim() === "(true)");
        let alert = known?.alert;
        if (!alert && polCount === 0) alert = "RLS OFF";
        else if (!alert && hasTrueQual) alert = "USING(true)";
        return [t.table_name, t.col_count || 0, t.row_estimate || 0, known?.desc || "", alert];
      }),
    };
  });
}

/* ═══ COMPONENTS ═══ */

function Badge({ children, variant }) {
  const s = { new: { bg: C.teal, c: "#fff", b: C.teal }, planned: { bg: "transparent", c: C.planned, b: C.planned }, ext: { bg: `${C.amber}18`, c: C.amberDark, b: `${C.amberDark}60` } }[variant];
  return <span style={{ background: s.bg, color: s.c, border: `1px solid ${s.b}`, borderRadius: 3, padding: "0 5px", fontSize: 8, fontWeight: 700, fontFamily: fnt, lineHeight: "16px", whiteSpace: "nowrap" }}>{children}</span>;
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.planned;
  return <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 3, padding: "1px 6px", fontSize: 8, fontWeight: 700, fontFamily: fnt, lineHeight: "16px" }}>{cfg.label}</span>;
}

function ProgressBar({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
      <div style={{ flex: 1, height: 3, background: `${color}18`, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: fnt, color, minWidth: 26, textAlign: "right" }}>{value}%</span>
    </div>
  );
}

function PkgModal({ pkg, onClose, allRows }) {
  if (!pkg) return null;
  const allApps = (allRows || ROWS).flatMap(r => r.apps);
  const users = allApps.filter(a => pkg.users.includes(a.id));
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 14, padding: 24, maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: pkg.layer === "f" ? 2 : "50%", background: pkg.layer === "f" ? C.amberDark : C.cyan }} />
            <span style={{ fontWeight: 800, fontSize: 16, fontFamily: fnt, color: C.text }}>@onsite/{pkg.name}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textMuted, padding: 4 }}>{"\u2715"}</button>
        </div>
        <div style={{ background: pkg.layer === "f" ? C.amberBg : `${C.cyan}08`, borderRadius: 6, padding: "3px 10px", display: "inline-block", marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: fnt, color: pkg.layer === "f" ? C.amberDark : C.cyan }}>{pkg.layer === "f" ? "\u25A0 FUNDA\u00C7\u00C3O" : "\u25CF COMPOSI\u00C7\u00C3O"}</span>
        </div>
        <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.5, margin: "0 0 14px 0" }}>{pkg.desc}</p>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, fontFamily: fnt, marginBottom: 8, letterSpacing: 0.5 }}>USADO POR {users.length} APP{users.length !== 1 ? "S" : ""}</div>
          {users.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {users.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 5, background: `${a.color}08`, border: `1px solid ${a.color}25`, borderRadius: 6, padding: "4px 10px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: fnt }}>{a.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ color: C.textMuted, fontSize: 11, fontStyle: "italic" }}>Nenhum app consome diretamente</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AppModal({ app, onClose }) {
  const [section, setSection] = useState("overview");
  const [activeScreen, setActiveScreen] = useState(null);
  if (!app) return null;

  const menuItems = [
    { id: "overview", label: "Vis\u00E3o Geral" },
    { id: "stack", label: "Stack e Pipeline" },
    { id: "ui", label: "UI e Imagens" },
  ];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 16, width: 1100, maxWidth: "96vw", height: 720, maxHeight: "92vh", boxShadow: "0 32px 100px rgba(0,0,0,0.25)", border: `1px solid ${C.border}`, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 220, background: C.bg, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* App identity */}
          <div style={{ padding: "28px 24px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: app.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 800, fontSize: 20, fontFamily: fnt, color: C.text }}>{app.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <StatusBadge status={app.status} />
              <span style={{ color: C.textMuted, fontSize: 11, fontFamily: fnt }}>{app.sub}</span>
            </div>
            <ProgressBar value={app.progress} color={app.color} />
          </div>

          {/* Nav */}
          <div style={{ flex: 1, padding: "0 12px" }}>
            {menuItems.map(item => {
              const active = section === item.id;
              return (
                <button key={item.id} onClick={() => { setSection(item.id); setActiveScreen(null); }} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "12px 14px", marginBottom: 2, border: "none", cursor: "pointer",
                  background: active ? `${app.color}0C` : "transparent",
                  borderRadius: 8,
                  transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: fnt, color: active ? app.color : C.textSec }}>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Deps at bottom */}
          {app.deps?.length > 0 && (
            <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ color: C.textMuted, fontSize: 9, fontWeight: 700, fontFamily: fnt, letterSpacing: 1, marginBottom: 8 }}>PACKAGES ({app.deps.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {app.deps.map(d => (
                  <span key={d} style={{ background: `${C.amber}10`, borderRadius: 4, padding: "3px 8px", fontSize: 10, color: C.amberDark, fontFamily: fnt, fontWeight: 600 }}>{d}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: fnt, color: C.text }}>{menuItems.find(m => m.id === section)?.label}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted }}>{app.desc}</p>
            </div>
            <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: C.textMuted, flexShrink: 0 }}>{"\u2715"}</button>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
            {section === "overview" && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: fnt, color: C.text, margin: "0 0 16px" }}>O que é o {app.name}?</h3>
                <p style={{ color: C.textSec, fontSize: 15, lineHeight: 1.8, margin: 0, maxWidth: 600 }}>{app.investor}</p>
                <div style={{ marginTop: 28, padding: 20, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                    <div>
                      <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, fontFamily: fnt, letterSpacing: 1, marginBottom: 6 }}>PROGRESSO</div>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: fnt, color: app.color }}>{app.progress}%</div>
                    </div>
                    <div>
                      <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, fontFamily: fnt, letterSpacing: 1, marginBottom: 6 }}>TELAS</div>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: fnt, color: C.text }}>{app.screens?.length || 0}</div>
                    </div>
                    <div>
                      <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, fontFamily: fnt, letterSpacing: 1, marginBottom: 6 }}>PACKAGES</div>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: fnt, color: C.text }}>{app.deps?.length || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {section === "stack" && app.dev && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  { label: "STACK", value: app.dev.stack },
                  { label: "PIPELINE", value: app.dev.pipeline },
                  { label: "ENTRY POINT", value: app.dev.entry, mono: true },
                  { label: "DEV PORT", value: app.dev.port ? `localhost:${app.dev.port}` : "N/A", mono: true },
                  { label: "PACKAGES", value: `${app.deps?.length || 0} internos: ${app.deps?.join(", ") || "nenhum"}` },
                  { label: "NOTAS", value: app.dev.notes },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: fnt, color: C.textMuted, letterSpacing: 1.2, marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 14, color: C.text, fontFamily: item.mono ? fnt : "inherit", lineHeight: 1.6, background: item.mono ? C.bg : "transparent", padding: item.mono ? "10px 14px" : 0, borderRadius: 8, border: item.mono ? `1px solid ${C.border}` : "none" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}

            {section === "ui" && (
              <div style={{ height: "100%" }}>
                {activeScreen !== null ? (
                  /* ── Tela expandida ── */
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexShrink: 0 }}>
                      <button onClick={() => setActiveScreen(null)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{"\u2190"}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: fnt, color: C.textSec }}>Voltar</span>
                      </button>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: fnt, color: C.text }}>{app.screens[activeScreen].name}</span>
                      <span style={{ fontSize: 11, color: C.textMuted }}>{activeScreen + 1}/{app.screens.length}</span>
                    </div>
                    <div style={{ flex: 1, background: `linear-gradient(160deg, ${app.color}10, ${app.color}05)`, borderRadius: 14, border: `1.5px solid ${app.color}18`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 0, position: "relative" }}>
                      <div style={{ width: 100, height: 100, borderRadius: 24, background: `${app.color}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 12, background: app.color, opacity: 0.45 }} />
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: fnt, color: C.text, marginBottom: 10 }}>{app.screens[activeScreen].name}</div>
                      <div style={{ fontSize: 15, color: C.textMuted, maxWidth: 480, textAlign: "center", lineHeight: 1.7 }}>{app.screens[activeScreen].desc}</div>
                      <div style={{ position: "absolute", bottom: 16, right: 20, display: "flex", gap: 6 }}>
                        {app.screens.map((_, j) => (
                          <button key={j} onClick={() => setActiveScreen(j)} style={{
                            width: 28, height: 28, borderRadius: 6, border: `1.5px solid ${j === activeScreen ? app.color : C.border}`,
                            background: j === activeScreen ? `${app.color}12` : C.bgCard,
                            cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: fnt,
                            color: j === activeScreen ? app.color : C.textMuted,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>{j + 1}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Grid de telas ── */
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, fontFamily: fnt, color: C.text, margin: "0 0 20px" }}>Telas ({app.screens?.length || 0})</h3>
                    {app.screens?.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                        {app.screens.map((scr, i) => (
                          <div key={i} onClick={() => setActiveScreen(i)} style={{
                            background: C.bgCard, border: `1.5px solid ${C.border}`,
                            borderRadius: 12, overflow: "hidden", cursor: "pointer",
                            transition: "border-color 0.2s, box-shadow 0.2s",
                          }}>
                            <div style={{ height: 170, background: `linear-gradient(135deg, ${app.color}12, ${app.color}06)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                              <div style={{ width: 56, height: 56, borderRadius: 14, background: `${app.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, background: app.color, opacity: 0.5 }} />
                              </div>
                              <div style={{ position: "absolute", top: 10, right: 12, background: `${app.color}15`, borderRadius: 4, padding: "2px 8px" }}>
                                <span style={{ fontSize: 9, fontWeight: 700, fontFamily: fnt, color: app.color }}>{i + 1}/{app.screens.length}</span>
                              </div>
                            </div>
                            <div style={{ padding: "16px 18px" }}>
                              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: fnt, color: C.text, marginBottom: 6 }}>{scr.name}</div>
                              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>{scr.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 40, textAlign: "center", background: C.bg, borderRadius: 12, border: `1px dashed ${C.border}` }}>
                        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>App planejado — telas ainda não definidas</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TechModal({ tab, section, setSection, onClose }) {
  if (!tab) return null;

  const mt = (items) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 14, marginBottom: 24 }}>
      {items.map(m => (
        <div key={m.l} style={{ background: C.bg, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: fnt, color: C.textMuted, letterSpacing: 1, marginBottom: 6 }}>{m.l}</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: fnt, color: m.c || tab.color }}>{m.v}</div>
          {m.s && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{m.s}</div>}
        </div>
      ))}
    </div>
  );

  const sl = (items) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => {
        const sc = { ok: C.green, warn: C.amber, error: C.red, info: C.blue }[item.s] || C.textMuted;
        const si = { ok: "\u2713", warn: "!", error: "\u2717", info: "i" }[item.s] || "?";
        return (
          <div key={i} style={{ display: "flex", gap: 12, padding: "11px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, alignItems: "flex-start" }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: `${sc}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: sc, flexShrink: 0, marginTop: 1 }}>{si}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, fontFamily: fnt, color: C.text }}>{item.t}</div>
              <div style={{ fontSize: 12, color: C.textSec, marginTop: 3, lineHeight: 1.5 }}>{item.d}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const tb = (headers, rows) => (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: headers.map(h => h.w || "1fr").join(" "), background: C.bg, padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
        {headers.map(h => <span key={h.l} style={{ fontSize: 9, fontWeight: 700, fontFamily: fnt, color: C.textMuted, letterSpacing: 1 }}>{h.l}</span>)}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: headers.map(h => h.w || "1fr").join(" "), padding: "9px 14px", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none", background: i % 2 === 1 ? `${C.bg}60` : "transparent" }}>
          {row.map((cell, j) => <span key={j} style={{ fontSize: 12, color: j === 0 ? C.text : C.textSec, fontWeight: j === 0 ? 600 : 400, fontFamily: j === 0 ? fnt : "inherit", lineHeight: 1.5 }}>{cell}</span>)}
        </div>
      ))}
    </div>
  );

  const sub = (text) => <div style={{ fontSize: 10, fontWeight: 700, fontFamily: fnt, color: C.textMuted, letterSpacing: 1.2, marginBottom: 12, marginTop: 24 }}>{text}</div>;
  const p = (text) => <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.8, margin: "0 0 20px", maxWidth: 620 }}>{text}</p>;

  const content = (() => {
    const k = `${tab.id}/${section}`;

    /* ── DATA FLOW ── */
    if (k === "data-flow/overview") return (<div>
      {p("Apps Next.js usam @onsite/supabase (SSR com cookies httpOnly). Apps Expo conectam direto ao Supabase com anon key + RLS. N\u00E3o h\u00E1 edge functions nem realtime subscriptions \u2014 modelo intencional de polling.")}
      {mt([{ l: "API ROUTES", v: "29", s: "4 apps Next.js" }, { l: "EDGE FUNCTIONS", v: "0", s: "planejadas" }, { l: "REALTIME SUBS", v: "0", s: "polling intencional" }])}
      {sub("PADR\u00C3O DE CONEX\u00C3O")}
      {sl([
        { s: "ok", t: "Next.js \u2192 SSR", d: "Monitor, Analytics, Dashboard, Auth usam @onsite/supabase com cookies. Server Components + Server Actions." },
        { s: "ok", t: "Expo \u2192 Direct", d: "Timekeeper, Operator, Field, Inspect conectam direto com anon key. RLS protege os dados." },
        { s: "ok", t: "Capacitor \u2192 Hybrid", d: "Calculator usa API serverless (/api/interpret) + acesso an\u00F4nimo sem auth." },
      ])}
    </div>);
    if (k === "data-flow/routes") return (<div>
      {tb(
        [{ l: "APP", w: "120px" }, { l: "ROUTES", w: "60px" }, { l: "EXEMPLOS" }],
        [
          ["Monitor", "8", "/api/timeline/mediate, /api/photos, /api/houses"],
          ["Dashboard", "11", "/api/subscriptions, /api/admin, /api/members"],
          ["Auth", "7", "/api/auth/callback, /api/auth/confirm, /api/delete-account"],
          ["Analytics", "2", "/api/export, /api/kpis"],
          ["Calculator", "1", "/api/interpret (voice \u2192 calculation)"],
        ]
      )}
      {sub("EXPO APPS (0 API ROUTES)")}
      {p("Timekeeper, Operator, Field e Inspect n\u00E3o t\u00EAm rotas API pr\u00F3prias. Conectam diretamente ao Supabase client-side via @supabase/supabase-js com anon key.")}
    </div>);
    if (k === "data-flow/patterns") return (<div>
      {sub("SSR PATTERN (NEXT.JS)")}
      {sl([
        { s: "ok", t: "@onsite/supabase/server", d: "createClient() com cookies httpOnly. Usado em Server Components e Server Actions." },
        { s: "ok", t: "@onsite/supabase/client", d: "createBrowserClient() para Client Components. Synca session com cookies." },
        { s: "ok", t: "@onsite/supabase/middleware", d: "Refresh de session autom\u00E1tico via middleware Next.js." },
      ])}
      {sub("DIRECT PATTERN (EXPO)")}
      {sl([
        { s: "ok", t: "Supabase JS direto", d: "Cada app cria seu client com SUPABASE_URL + SUPABASE_ANON_KEY. RLS como \u00FAnica barreira." },
        { s: "ok", t: "AsyncStorage session", d: "Session persistida via AsyncStorage. Auto-refresh de JWT tokens." },
        { s: "warn", t: "Sem middleware", d: "N\u00E3o h\u00E1 camada intermedi\u00E1ria. Anon key exposta no bundle (normal, mas depende 100% do RLS)." },
      ])}
      {sub("AUTH FLOW")}
      {sl([
        { s: "ok", t: "Supabase Auth", d: "Magic link + email/password. Shared session via @onsite/auth package." },
        { s: "warn", t: "Calculator sem auth", d: "Calculator opera anonimamente. voice_logs com user_id NULL. Rate limit por IP." },
      ])}
    </div>);
    if (k === "data-flow/gaps") return (<div>
      {sl([
        { s: "warn", t: "Edge Functions: 0 deployed", d: "Planejadas para rate limiting, image resize, webhook processing. Hoje tudo via API routes Next.js." },
        { s: "info", t: "Realtime: 0 subscriptions", d: "Modelo de polling intencional. Futuro: realtime para timeline e chat (SheetChat)." },
        { s: "warn", t: "Sem webhook receiver", d: "Nenhum endpoint para webhooks Stripe, SendGrid, etc. Billing depende de polling." },
        { s: "info", t: "Sem API Gateway", d: "Cada app exp\u00F5e suas pr\u00F3prias rotas. Sem rate limiting unificado ou API versioning." },
        { s: "warn", t: "Sem OpenAPI/Swagger", d: "Nenhuma documenta\u00E7\u00E3o autom\u00E1tica das 29 rotas. Dificulta onboarding de devs." },
        { s: "info", t: "Sem cache layer", d: "Nenhum Redis/Upstash. Views e queries sem cache. Aceit\u00E1vel no volume atual." },
      ])}
    </div>);

    /* ── SECURITY ── */
    if (k === "security/overview") return (<div>
      {p("Todas as 40+ tabelas t\u00EAm RLS habilitado. 67 policies implementadas. 5 roles organizacionais. Separa\u00E7\u00E3o de chaves anon vs service_role. 5 fun\u00E7\u00F5es SECURITY DEFINER para queries privilegiadas.")}
      {mt([{ l: "RLS POLICIES", v: "67", s: "todas as tabelas" }, { l: "ORG ROLES", v: "5", s: "worker \u2192 owner" }, { l: "SEC DEFINER", v: "5", s: "fun\u00E7\u00F5es privilegiadas" }])}
      {sub("ROLES")}
      {tb(
        [{ l: "ROLE", w: "110px" }, { l: "N\u00CDVEL", w: "50px" }, { l: "PERMISS\u00D5ES" }],
        [
          ["Worker", "1", "Upload fotos, ver pr\u00F3prios dados, clock in/out"],
          ["Inspector", "2", "Validar fotos, aprovar/rejeitar fases"],
          ["Supervisor", "3", "Gerenciar sites e casas, atribuir workers"],
          ["Admin", "4", "Gerenciar org, membros, billing"],
          ["Owner", "5", "Tudo \u2014 incluindo deletar org"],
        ]
      )}
    </div>);
    if (k === "security/rls") return (<div>
      {tb(
        [{ l: "GRUPO", w: "120px" }, { l: "TABELAS", w: "55px" }, { l: "POLICIES", w: "60px" }, { l: "PADR\u00C3O" }],
        [
          ["Timekeeper", "3", "9", "own data + viewer via access_grants"],
          ["Core/Identity", "5", "12", "own data (CRUD) + viewer shared"],
          ["Eagle", "7", "~10", "\u26A0\uFE0F PERMISSIVO (temporário)"],
          ["Calculator", "2", "4", "own data OR null user_id"],
          ["Shop", "6", "8", "public SELECT + admin ALL"],
          ["Billing", "3", "5", "public SELECT + own data"],
          ["Admin", "2", "7", "is_active_admin() + super_admin"],
          ["Logs", "4", "8", "own data + authenticated INSERT"],
          ["Reference", "3", "3", "public SELECT (is_active)"],
          ["Aggregations", "3", "4", "admin only + own agg_user_daily"],
        ]
      )}
      {sub("SECURITY DEFINER FUNCTIONS")}
      {sl([
        { s: "ok", t: "is_active_admin()", d: "Verifica se user \u00E9 admin ativo. Bypassa RLS de admin_users." },
        { s: "ok", t: "is_super_admin()", d: "Verifica se user \u00E9 super_admin. Para opera\u00E7\u00F5es destrutivas." },
        { s: "ok", t: "lookup_pending_token()", d: "Busca token QR de forma segura sem expor pending_tokens." },
        { s: "ok", t: "get_user_organization_ids()", d: "Retorna org IDs do user. Base do multi-tenancy RLS." },
        { s: "ok", t: "check_email_exists()", d: "Verifica email em auth.users sem expor dados." },
      ])}
    </div>);
    if (k === "security/trust") return (<div>
      {sub("CHAVES DE ACESSO")}
      {sl([
        { s: "ok", t: "anon key (publishable)", d: "Usada por todos os clients. Exposta no bundle. RLS \u00E9 a barreira. Sem acesso a service_role." },
        { s: "ok", t: "service_role key", d: "Apenas server-side (Next.js API routes, Server Actions). Bypassa RLS. Nunca no client." },
        { s: "ok", t: "JWT tokens", d: "Supabase Auth emite JWTs. Claims incluem user_id, role, email. Refresh autom\u00E1tico." },
      ])}
      {sub("BOUNDARIES")}
      {sl([
        { s: "ok", t: "Client \u2192 Supabase", d: "Anon key + RLS. Sem acesso direto a tabelas sem policy." },
        { s: "ok", t: "Server \u2192 Supabase", d: "Service_role key. Usado para admin ops, triggers, migrations." },
        { s: "ok", t: "App \u2192 App", d: "Sem comunica\u00E7\u00E3o direta entre apps. Todos passam pelo Supabase." },
        { s: "warn", t: "Expo bundle", d: "Anon key no bundle Android. Engenharia reversa poss\u00EDvel mas in\u00F3cua (RLS protege)." },
      ])}
    </div>);
    if (k === "security/gaps") return (<div>
      {sl([
        { s: "error", t: "Eagle tables: USING(true)", d: "7 tabelas Eagle com RLS permissivo. Qualquer authenticated user l\u00EA/escreve tudo. Prioridade P0." },
        { s: "warn", t: "HaveIBeenPwned desabilitado", d: "Prote\u00E7\u00E3o contra senhas vazadas est\u00E1 OFF no Supabase Dashboard. Ativar manualmente." },
        { s: "warn", t: "Sem rate limiting no Supabase", d: "Anon key sem throttle. Abuso poss\u00EDvel via chamadas diretas ao PostgREST." },
        { s: "warn", t: "Sem key rotation", d: "Nenhum processo de rota\u00E7\u00E3o de anon/service_role keys." },
        { s: "info", t: "postgis no schema public", d: "Extens\u00E3o deveria estar em 'extensions'. Impacto baixo." },
      ])}
    </div>);

    /* ── MULTI-TENANT ── */
    if (k === "multi-tenant/overview") return (<div>
      {p("Multi-tenancy via coluna organization_id em 14 tabelas. Memberships N:N em core_org_memberships com 5 roles. RLS usa get_user_organization_ids() para filtrar por org. Padr\u00E3o OR organization_id IS NULL para dados legados.")}
      {mt([{ l: "TABELAS c/ ORG_ID", v: "14", s: "de ~40 total" }, { l: "HELPER FUNCS", v: "4", s: "SECURITY DEFINER" }, { l: "ORG ROLES", v: "5", s: "worker \u2192 owner" }])}
      {sub("MODELO")}
      {sl([
        { s: "ok", t: "N:N Memberships", d: "Um worker pode pertencer a m\u00FAltiplas orgs. core_org_memberships(user_id, org_id, role)." },
        { s: "ok", t: "RLS Pattern", d: "USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL)" },
        { s: "warn", t: "NULL = legado", d: "Dados sem org_id s\u00E3o vis\u00EDveis a todos. Necess\u00E1rio migrar para org espec\u00EDfica." },
      ])}
    </div>);
    if (k === "multi-tenant/coverage") return (<div>
      {tb(
        [{ l: "TABELA", w: "180px" }, { l: "APP", w: "100px" }, { l: "STATUS" }],
        [
          ["egl_sites", "Eagle", "\u2705 Implementado"],
          ["egl_houses", "Eagle", "\u2705 Implementado"],
          ["egl_photos", "Eagle", "\u2705 Implementado"],
          ["egl_progress", "Eagle", "\u2705 Implementado"],
          ["egl_timeline", "Eagle", "\u2705 Implementado"],
          ["egl_issues", "Eagle", "\u2705 Implementado"],
          ["egl_scans", "Eagle", "\u2705 Implementado"],
          ["egl_messages", "Eagle", "\u2705 Implementado"],
          ["tmk_entries", "Timekeeper", "\u2705 Implementado"],
          ["tmk_geofences", "Timekeeper", "\u2705 Implementado"],
          ["tmk_projects", "Timekeeper", "\u2705 Implementado"],
          ["ccl_calculations", "Calculator", "\u2705 Implementado"],
          ["ccl_templates", "Calculator", "\u2705 Implementado"],
          ["int_ai_reports", "Intelligence", "\u2705 Implementado"],
        ]
      )}
    </div>);
    if (k === "multi-tenant/helpers") return (<div>
      {sl([
        { s: "ok", t: "get_user_organization_ids()", d: "Retorna array de org IDs do user autenticado. SECURITY DEFINER \u2014 bypassa RLS para consultar core_org_memberships." },
        { s: "ok", t: "user_belongs_to_org(org_id)", d: "Retorna boolean. Verifica se user pertence a uma org espec\u00EDfica." },
        { s: "ok", t: "get_user_org_role(org_id)", d: "Retorna role (worker/inspector/supervisor/admin/owner) do user na org." },
        { s: "ok", t: "user_is_org_admin(org_id)", d: "Retorna boolean. True se role \u00E9 'admin' ou 'owner'." },
      ])}
      {sub("TABELAS DE SUPORTE")}
      {tb(
        [{ l: "TABELA", w: "200px" }, { l: "PROP\u00D3SITO" }],
        [
          ["core_organizations", "Registro de empresas/construtoras (tenants)"],
          ["core_org_memberships", "N:N entre users e orgs com role"],
          ["core_pricing_tiers", "Pricing por sqft vinculado \u00E0 org"],
        ]
      )}
    </div>);
    if (k === "multi-tenant/gaps") return (<div>
      {sl([
        { s: "warn", t: "material_requests sem org_id", d: "Tabela de pedidos de material (Operator) n\u00E3o tem organization_id. N\u00E3o filtra por tenant." },
        { s: "warn", t: "operator_assignments sem org_id", d: "Atribui\u00E7\u00F5es de operador n\u00E3o s\u00E3o tenant-scoped." },
        { s: "warn", t: "RLS n\u00E3o enfor\u00E7a org_id", d: "Eagle tables usam USING(true). Quando fixar, precisa incluir org_id no RLS." },
        { s: "info", t: "Sem tenant isolation tests", d: "Nenhum teste verifica que user A n\u00E3o v\u00EA dados da org B." },
        { s: "info", t: "Dados legados sem org", d: "Dados criados antes da migration 004 t\u00EAm org_id NULL. Precisam ser migrados." },
      ])}
    </div>);

    /* ── LIFECYCLE ── */
    if (k === "lifecycle/overview") return (<div>
      {p("Sistema de consentimento granular com 9 tipos. Soft deletes no Timekeeper (deleted_at). Fun\u00E7\u00F5es de reten\u00E7\u00E3o existem mas n\u00E3o est\u00E3o agendadas. Account deletion com CASCADE. Storage files N\u00C3O s\u00E3o deletados quando records s\u00E3o removidos.")}
      {mt([{ l: "CONSENT TYPES", v: "9", s: "granulares" }, { l: "SOFT DELETE", v: "3", s: "tabelas tmk_*" }, { l: "RETENTION JOBS", v: "0", s: "n\u00E3o agendado", c: C.red }])}
    </div>);
    if (k === "lifecycle/consent") return (<div>
      {tb(
        [{ l: "TIPO", w: "200px" }, { l: "OBRIGAT\u00D3RIO", w: "90px" }, { l: "DESCRI\u00C7\u00C3O" }],
        [
          ["terms_of_service", "Sim", "Termos de uso do app"],
          ["privacy_policy", "Sim", "Pol\u00EDtica de privacidade"],
          ["data_collection", "Sim", "Coleta de dados de uso"],
          ["voice_collection", "N\u00E3o", "Grava\u00E7\u00E3o de \u00E1udio de voz"],
          ["voice_training", "N\u00E3o", "Uso de voz para treinar IA"],
          ["location_tracking", "N\u00E3o", "Rastreamento GPS cont\u00EDnuo"],
          ["analytics", "N\u00E3o", "Analytics comportamental"],
          ["marketing", "N\u00E3o", "Comunica\u00E7\u00F5es de marketing"],
          ["third_party_sharing", "N\u00E3o", "Compartilhamento com terceiros"],
        ]
      )}
      {sub("CAMPOS DO REGISTRO")}
      {p("Cada consentimento registra: document_version, document_url, document_hash, IP, user_agent, app_name, collection_method. Imut\u00E1vel \u2014 revoga\u00E7\u00E3o cria novo record.")}
    </div>);
    if (k === "lifecycle/retention") return (<div>
      {sub("SOFT DELETES")}
      {sl([
        { s: "ok", t: "tmk_entries (deleted_at)", d: "Entradas de ponto soft-deleted. Queries filtram WHERE deleted_at IS NULL." },
        { s: "ok", t: "tmk_geofences (deleted_at)", d: "Geofences soft-deleted. Mant\u00E9m hist\u00F3rico de horas." },
        { s: "ok", t: "tmk_projects (deleted_at)", d: "Projetos soft-deleted. Entries referenciando projeto mantidas." },
      ])}
      {sub("RETENTION CLEANUP")}
      {sl([
        { s: "warn", t: "retention_cleanup.sql existe", d: "Fun\u00E7\u00E3o limpa logs >30 dias e events >90 dias. Mas N\u00C3O est\u00E1 agendada \u2014 precisa de pg_cron." },
        { s: "ok", t: "/api/delete-account", d: "Endpoint em apps/auth. CASCADE deleta todos os dados do user. Irrevers\u00EDvel." },
        { s: "error", t: "Storage files \u00F3rf\u00E3os", d: "Ao deletar records no DB, arquivos no Storage (fotos, \u00E1udios) N\u00C3O s\u00E3o removidos." },
      ])}
    </div>);
    if (k === "lifecycle/gaps") return (<div>
      {sl([
        { s: "error", t: "pg_cron n\u00E3o configurado", d: "retention_cleanup.sql existe mas nunca executa. Logs e events acumulam indefinidamente." },
        { s: "error", t: "Storage orphans", d: "Deletar DB records n\u00E3o deleta arquivos no Storage. Sem garbage collector." },
        { s: "warn", t: "Sem anonymization", d: "Nenhuma fun\u00E7\u00E3o para anonimizar dados. LGPD/GDPR exigem para dados retidos ap\u00F3s exclus\u00E3o." },
        { s: "warn", t: "Sem data export", d: "Nenhum endpoint de portabilidade (LGPD Art. 18). User n\u00E3o consegue exportar seus dados." },
        { s: "info", t: "Sem audit trail", d: "Apenas admin_logs para a\u00E7\u00F5es admin. A\u00E7\u00F5es de users comuns n\u00E3o s\u00E3o auditadas." },
      ])}
    </div>);

    /* ── OBSERVABILITY ── */
    if (k === "observability/overview") return (<div>
      {p("Package @onsite/logger implementado com 16 tags, ring buffer de 500 entries, e sistema de sinks (console + file). Sentry configurado APENAS no Timekeeper. Nenhum health check endpoint. 3 apps Expo sem logging algum.")}
      {mt([{ l: "LOGGER TAGS", v: "16", s: "@onsite/logger" }, { l: "SENTRY APPS", v: "1/8", s: "apenas Timekeeper", c: C.red }, { l: "HEALTH CHECKS", v: "0", s: "nenhum endpoint", c: C.red }])}
    </div>);
    if (k === "observability/logger") return (<div>
      {sub("TAGS DISPON\u00CDVEIS (16)")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {["AUTH","SYNC","GPS","GEOFENCE","ENTRY","OFFLINE","TIMER","PHOTO","UPLOAD","AI","CAMERA","NETWORK","ERROR","DEBUG","APP","BACKGROUND"].map(t => (
          <span key={t} style={{ background: `${tab.color}08`, border: `1px solid ${tab.color}20`, borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 600, fontFamily: fnt, color: tab.color }}>{t}</span>
        ))}
      </div>
      {sub("FEATURES")}
      {sl([
        { s: "ok", t: "Ring Buffer (500)", d: "\u00DAltimas 500 entries mantidas em mem\u00F3ria. Evita memory leak em long-running apps." },
        { s: "ok", t: "Console Sink", d: "Output formatado com emoji + tag + timestamp. Filtro por n\u00EDvel." },
        { s: "ok", t: "File Sink", d: "Persiste logs em arquivo local. \u00DAtil para debug p\u00F3s-crash." },
        { s: "warn", t: "Sem remote sink", d: "Logs n\u00E3o s\u00E3o enviados para servi\u00E7o externo. Apenas local." },
      ])}
      {sub("ADO\u00C7\u00C3O POR APP")}
      {tb(
        [{ l: "APP", w: "130px" }, { l: "LOGGER", w: "70px" }, { l: "SENTRY", w: "70px" }, { l: "NOTA" }],
        [
          ["Timekeeper", "\u2705", "\u2705", "\u00DAnico app com stack completo"],
          ["Monitor", "\u2705", "\u2716", "Logger via @onsite/logger"],
          ["Analytics", "\u2705", "\u2716", "Logger b\u00E1sico"],
          ["Dashboard", "\u2705", "\u2716", "Logger b\u00E1sico"],
          ["Calculator", "\u2705", "\u2716", "Logger custom (n\u00E3o @onsite/logger)"],
          ["Operator", "\u2716", "\u2716", "Sem logging"],
          ["Field", "\u2716", "\u2716", "Sem logging"],
          ["Inspect", "\u2716", "\u2716", "Sem logging"],
        ]
      )}
    </div>);
    if (k === "observability/monitoring") return (<div>
      {sub("SENTRY")}
      {sl([
        { s: "ok", t: "Timekeeper: Sentry ativo", d: "DSN configurado em app.json. Captura crashes, erros JS, e performance." },
        { s: "error", t: "7 apps sem Sentry", d: "Monitor, Analytics, Dashboard, Auth, Operator, Field, Inspect, Calculator \u2014 sem error tracking." },
      ])}
      {sub("HEALTH CHECKS")}
      {sl([
        { s: "error", t: "0 endpoints /health", d: "Nenhum app exp\u00F5e /health ou /ready. Imposs\u00EDvel monitorar uptime externamente." },
        { s: "error", t: "Sem uptime monitoring", d: "Nenhum servi\u00E7o (UptimeRobot, Checkly, etc.) monitorando os apps." },
      ])}
      {sub("APM & ALERTING")}
      {sl([
        { s: "error", t: "Sem APM", d: "Nenhum Application Performance Monitoring. Sem m\u00E9tricas de lat\u00EAncia, throughput, error rate." },
        { s: "error", t: "Sem alerting", d: "Nenhum sistema de alertas. Erros s\u00E3o descobertos manualmente." },
      ])}
    </div>);
    if (k === "observability/gaps") return (<div>
      {sl([
        { s: "error", t: "3 Expo apps sem logging", d: "Operator, Field, Inspect n\u00E3o t\u00EAm @onsite/logger integrado. Debugging \u00E9 cego." },
        { s: "error", t: "7 apps sem Sentry", d: "Apenas Timekeeper tem error tracking. Crashes nos outros apps passam despercebidos." },
        { s: "error", t: "0 health endpoints", d: "Nenhum /health. Imposs\u00EDvel integrar com load balancer ou monitoring." },
        { s: "warn", t: "Sem remote log sink", d: "Logs ficam apenas no device/server. Sem agrega\u00E7\u00E3o centralizada (Loki, DataDog)." },
        { s: "warn", t: "Calculator com logger custom", d: "Usa logger pr\u00F3prio, n\u00E3o @onsite/logger. Sem consist\u00EAncia de formato." },
        { s: "info", t: "Sem structured metrics", d: "Nenhum contador/histogram exposto. Sem dashboards de runtime." },
      ])}
    </div>);

    return <p style={{ color: C.textMuted }}>Se\u00E7\u00E3o n\u00E3o encontrada</p>;
  })();

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 16, width: 1100, maxWidth: "96vw", height: 720, maxHeight: "92vh", boxShadow: "0 32px 100px rgba(0,0,0,0.25)", border: `1px solid ${C.border}`, display: "flex", overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{ width: 220, background: C.bg, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "28px 24px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{tab.icon}</span>
              <span style={{ fontWeight: 800, fontSize: 18, fontFamily: fnt, color: C.text }}>{tab.name}</span>
            </div>
            <p style={{ color: C.textMuted, fontSize: 11, fontFamily: fnt, margin: 0, lineHeight: 1.5 }}>{tab.summary}</p>
          </div>
          <div style={{ flex: 1, padding: "0 12px" }}>
            {tab.menu.map(item => {
              const active = section === item.id;
              return (
                <button key={item.id} onClick={() => setSection(item.id)} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "12px 14px", marginBottom: 2, border: "none", cursor: "pointer",
                  background: active ? `${tab.color}0C` : "transparent", borderRadius: 8, transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: fnt, color: active ? tab.color : C.textSec }}>{item.l}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: fnt, color: C.text }}>{tab.menu.find(m => m.id === section)?.l || tab.name}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted }}>{tab.name} \u2014 investiga\u00E7\u00E3o real do monorepo</p>
            </div>
            <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: C.textMuted, flexShrink: 0 }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ SUPABASE EXPLORER ═══ */

function SupabaseExplorer({ schemaData }) {
  const sd = schemaData || SCHEMA_DATA;
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({ "core_": true });
  const [openTable, setOpenTable] = useState(null);

  const totalTables = sd.reduce((s, g) => s + g.t.length, 0);
  const totalAlerts = sd.reduce((s, g) => s + g.t.filter(t => t[4]).length, 0);

  const filtered = search
    ? sd.map(g => ({ ...g, t: g.t.filter(t => t[0].includes(search.toLowerCase()) || t[3].toLowerCase().includes(search.toLowerCase())) })).filter(g => g.t.length > 0)
    : sd;

  const alertColor = (a) => a === "RLS OFF" || a === "ANON CRUD" ? C.red : C.amber;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: C.supabase, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 800 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 15, fontFamily: fnt, color: C.supabase }}>SUPABASE EXPLORER</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontFamily: fnt, color: C.textMuted }}>{totalTables} tables</span>
          <span style={{ fontSize: 10, fontFamily: fnt, color: C.textMuted }}>130+ RLS policies</span>
          <span style={{ fontSize: 10, fontFamily: fnt, color: C.textMuted }}>120+ FKs</span>
          {totalAlerts > 0 && <span style={{ fontSize: 10, fontFamily: fnt, color: C.red, fontWeight: 700 }}>{totalAlerts} alertas</span>}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14, maxWidth: 500, margin: "0 auto 14px" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={"Buscar tabela ou descri\u00E7\u00E3o..."}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`,
            fontFamily: fnt, fontSize: 12, background: C.bgCard, color: C.text, outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map(group => {
          const isOpen = openGroups[group.p] || search.length > 0;
          const groupAlerts = group.t.filter(t => t[4]).length;
          return (
            <div key={group.p} style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              {/* Group header */}
              <div
                onClick={() => setOpenGroups(prev => ({ ...prev, [group.p]: !prev[group.p] }))}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer",
                  borderBottom: isOpen ? `1px solid ${C.border}` : "none",
                  background: isOpen ? `${group.cl}06` : "transparent",
                }}
              >
                <span style={{ fontSize: 10, color: C.textMuted, fontFamily: fnt, width: 12 }}>{isOpen ? "▼" : "▶"}</span>
                <code style={{ color: group.cl, fontWeight: 800, fontSize: 12, fontFamily: fnt, minWidth: 44 }}>{group.p}</code>
                <span style={{ fontWeight: 700, fontSize: 12, fontFamily: fnt, color: C.text, flex: 1 }}>{group.l}</span>
                <span style={{ fontSize: 10, fontFamily: fnt, color: C.textMuted }}>{group.t.length} tabelas</span>
                {groupAlerts > 0 && <span style={{ fontSize: 9, fontWeight: 700, fontFamily: fnt, color: C.red, background: `${C.red}10`, borderRadius: 3, padding: "1px 6px" }}>{groupAlerts} alertas</span>}
              </div>

              {/* Tables */}
              {isOpen && (
                <div style={{ padding: "4px 8px 8px" }}>
                  {group.t.map(t => {
                    const [name, cols, rows, desc, alert] = t;
                    const isExp = openTable === name;
                    return (
                      <div key={name} style={{ marginBottom: 3 }}>
                        <div
                          onClick={() => setOpenTable(isExp ? null : name)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                            borderRadius: 6, cursor: "pointer",
                            background: isExp ? `${group.cl}08` : "transparent",
                            border: isExp ? `1px solid ${group.cl}20` : "1px solid transparent",
                          }}
                        >
                          <code style={{ fontFamily: fnt, fontSize: 11, fontWeight: 600, color: C.text, minWidth: 190 }}>{name}</code>
                          <span style={{ fontSize: 9, fontFamily: fnt, color: C.textMuted, minWidth: 55 }}>{cols} cols</span>
                          <span style={{ fontSize: 9, fontFamily: fnt, color: rows > 0 ? C.green : C.textMuted, minWidth: 50 }}>{rows} rows</span>
                          {alert && (
                            <span style={{ fontSize: 8, fontWeight: 800, fontFamily: fnt, color: alertColor(alert), background: `${alertColor(alert)}12`, borderRadius: 3, padding: "1px 6px", whiteSpace: "nowrap" }}>{alert}</span>
                          )}
                        </div>
                        {isExp && (
                          <div style={{ padding: "6px 10px 10px 22px" }}>
                            <p style={{ color: C.textSec, fontSize: 12, lineHeight: 1.6, margin: "0 0 6px" }}>{desc}</p>
                            {alert && (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${alertColor(alert)}08`, border: `1px solid ${alertColor(alert)}20`, borderRadius: 5, padding: "4px 10px", marginTop: 2 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: alertColor(alert), fontFamily: fnt }}>
                                  {alert === "RLS OFF" ? "⛔ RLS DESABILITADO — qualquer user autenticado acessa tudo" :
                                   alert === "ANON CRUD" ? "⚠ ANON com CRUD completo — anônimos podem ler/escrever" :
                                   "⚠ USING(true) — sem filtro real de dados"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: "center", color: C.textMuted, fontSize: 9, fontFamily: fnt, marginTop: 14, fontStyle: "italic" }}>
        {totalTables} tabelas em {sd.length} grupos · Clique nos grupos para expandir
      </p>
    </div>
  );
}

/* ═══ VISÃO 2037 TAB ═══ */

function VisaoTab() {
  const section = (title, color, children) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 20, borderRadius: 2, background: color }} />
        <span style={{ fontWeight: 800, fontSize: 14, fontFamily: fnt, color: C.text }}>{title}</span>
      </div>
      {children}
    </div>
  );

  const roadmapItem = (year, title, desc, color, done) => (
    <div key={year} style={{ display: "flex", gap: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? color : `${color}20`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {done && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
        </div>
        <div style={{ width: 2, flex: 1, background: `${color}30`, marginTop: 4 }} />
      </div>
      <div style={{ paddingBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontWeight: 800, fontSize: 13, fontFamily: fnt, color }}>{year}</span>
          <span style={{ fontWeight: 700, fontSize: 13, fontFamily: fnt, color: C.text }}>{title}</span>
        </div>
        <p style={{ color: C.textSec, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 8 }}>
      {section("A Oportunidade", C.amber, (
        <div style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20 }}>
          <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.8, margin: 0 }}>
            {"A ind\u00FAstria de constru\u00E7\u00E3o canadense \u00E9 "}
            <strong>um dos setores mais fragmentados e manuais</strong>
            {" da economia. Supervisores usam Excel, WhatsApp e pranchetas para controlar obras de milh\u00F5es de d\u00F3lares. N\u00E3o existe plataforma integrada que conecte todos os atores."}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 16 }}>
            {[
              ["CA$171B", "Indústria/ano", "PIB construção no Canadá"],
              ["1.5M", "Trabalhadores", "Sem ferramentas digitais"],
              ["~0%", "Digitalização", "Setor mais atrasado vs tech"],
            ].map(([v, l, d]) => (
              <div key={l} style={{ background: C.bg, borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: fnt, color: C.amber }}>{v}</div>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: fnt, color: C.text, marginTop: 2 }}>{l}</div>
                <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {section("Arquitetura Ampulheta", C.purple, (
        <div style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20, textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ background: `${C.blue}10`, borderRadius: 8, padding: "8px 24px", border: `1px solid ${C.blue}20` }}>
              <span style={{ fontWeight: 800, fontSize: 11, fontFamily: fnt, color: C.blue }}>COLETA</span>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>12 apps especializados capturando dados reais</div>
            </div>
            <svg width="40" height="24" viewBox="0 0 40 24"><path d="M10 2 L20 20 L30 2" stroke={C.purple} strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            <div style={{ background: `${C.supabase}10`, borderRadius: 8, padding: "8px 24px", border: `1px solid ${C.supabase}20` }}>
              <span style={{ fontWeight: 800, fontSize: 11, fontFamily: fnt, color: C.supabase }}>CENTRALIZAÇÃO</span>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>Supabase unificado · PostgreSQL + RLS + Auth</div>
            </div>
            <svg width="40" height="24" viewBox="0 0 40 24"><path d="M15 4 L20 20 L25 4" stroke={C.purple} strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            <div style={{ background: `${C.purple}10`, borderRadius: 8, padding: "8px 24px", border: `1px solid ${C.purple}20` }}>
              <span style={{ fontWeight: 800, fontSize: 11, fontFamily: fnt, color: C.purple }}>INTELIGÊNCIA</span>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>Prumo AI · Analytics · Marketplace de dados</div>
            </div>
          </div>
        </div>
      ))}

      {section("Roadmap 2024–2037", C.green, (
        <div style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20 }}>
          {[
            ["2024", "Primeiros apps", "Calculator (voz) + Timekeeper (GPS). Primeiros dados reais.", C.green, true],
            ["2025", "Eagle Ecosystem", "Monitor, Operator, Field, Inspect. Visual inspection + AI.", C.green, true],
            ["2026", "Plataforma completa", "Analytics, Sheets, Payments, Club. Billing + gamificação.", C.blue, false],
            ["2027", "Prumo AI v1", "Modelo treinado com 2+ anos de dados reais. Computer Vision + NLP.", C.purple, false],
            ["2028–30", "Robot pilot", "Kepler K2 com Prumo. Robô + humano no canteiro.", C.amber, false],
            ["2031–37", "Scale & License", "Marketplace de dados, White Label, expansão internacional.", C.dark, false],
          ].map(([y, t, d, c, done]) => roadmapItem(y, t, d, c, done))}
        </div>
      ))}

      {section("Data Moat", C.dark, (
        <div style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20 }}>
          <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.7, margin: "0 0 14px" }}>
            {"Cada dia de uso dos apps gera dados que alimentam a IA. Quanto mais dados, melhor a IA. Melhor a IA, mais usu\u00E1rios. Mais usu\u00E1rios, mais dados. "}
            <strong>Esse ciclo é impossível de copiar.</strong>
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
            {["Dados reais", "Network effect", "Integração vertical", "Conhecimento de domínio", "Vantagem de tempo"].map(t => (
              <span key={t} style={{ background: `${C.dark}08`, border: `1px solid ${C.dark}15`, borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: fnt, color: C.dark }}>{t}</span>
            ))}
          </div>
        </div>
      ))}

      {section("Kepler K2 — Robótica", C.amber, (
        <div style={{ background: C.bgCard, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.7, margin: "0 0 12px" }}>
                {"Em 10 anos, rob\u00F4s humanoides + humanos ser\u00E3o mais baratos que prefab para constru\u00E7\u00E3o residencial. O Prumo AI d\u00E1 o \u201Colho treinado\u201D de um carpinteiro ao rob\u00F4."}
              </p>
              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: fnt, color: C.textMuted, letterSpacing: 1, marginBottom: 6 }}>SPECS KEPLER K2</div>
              {[
                ["Preço", "~CA$45k"],
                ["Altura/Peso", "178cm / 85kg"],
                ["Payload", "30kg por braço"],
                ["Bateria", "8h operacional"],
                ["Mãos", "12 DoF — destreza fina"],
                ["SDK", "Aberto — custom .onnx models"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: fnt, color: C.text, minWidth: 80 }}>{k}</span>
                  <span style={{ fontSize: 11, color: C.textSec }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: `linear-gradient(135deg, ${C.amber}10, ${C.amber}05)`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px solid ${C.amber}20`, padding: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: `${C.amber}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>🤖</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 14, fontFamily: fnt, color: C.amberDark }}>Kepler K2</span>
              <span style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>"Bumblebee" · Produção em massa 2025</span>
              <span style={{ fontSize: 9, color: C.textMuted, marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>Open SDK = Android da robótica<br/>vs Tesla Optimus (fechado)</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ PORTAL: DOC BROWSER ═══ */

function DocBrowser() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCat, setOpenCat] = useState({});

  useEffect(() => {
    fetch("/api/docs").then(r => r.json()).then(d => { setDocs(d.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const categories = {};
  for (const doc of docs) {
    const cat = doc.category || "other";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(doc);
  }

  const catMeta = {
    root: { label: "📋 Root", color: C.amber },
    intelligence: { label: "🧠 Intelligence", color: C.purple },
    "per-app": { label: "📱 Per-App", color: C.blue },
    "per-package": { label: "📦 Per-Package", color: C.teal },
    memory: { label: "🏗️ Memory", color: C.cyan },
    other: { label: "📄 Outros", color: C.textMuted },
  };

  const freshColor = (mod) => {
    if (!mod) return C.textMuted;
    const days = Math.floor((Date.now() - new Date(mod).getTime()) / 86400000);
    if (days <= 7) return C.green;
    if (days <= 30) return C.amber;
    return C.red;
  };

  const freshLabel = (mod) => {
    if (!mod) return "?";
    const days = Math.floor((Date.now() - new Date(mod).getTime()) / 86400000);
    return `${days}d`;
  };

  const filtered = search
    ? docs.filter(d => d.relativePath.toLowerCase().includes(search.toLowerCase()) || (d.title || "").toLowerCase().includes(search.toLowerCase()))
    : docs;

  const filteredCats = {};
  for (const doc of filtered) {
    const cat = doc.category || "other";
    if (!filteredCats[cat]) filteredCats[cat] = [];
    filteredCats[cat].push(doc);
  }

  const totalLines = docs.reduce((s, d) => s + (d.lineCount || 0), 0);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 14, fontFamily: fnt, color: C.teal }}>DOCUMENTAÇÃO DO ECOSSISTEMA</span>
        <div style={{ color: C.textMuted, fontSize: 10, fontFamily: fnt, marginTop: 3 }}>
          {loading ? "Carregando..." : `${docs.length} docs · ${totalLines.toLocaleString()} linhas`}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto 12px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou título..."
          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bgCard, fontSize: 12, fontFamily: fnt, color: C.text, outline: "none", boxSizing: "border-box" }} />
      </div>

      {!loading && Object.entries(filteredCats).sort(([a], [b]) => {
        const order = ["root", "intelligence", "per-app", "per-package", "memory", "other"];
        return order.indexOf(a) - order.indexOf(b);
      }).map(([cat, catDocs]) => {
        const meta = catMeta[cat] || catMeta.other;
        const isOpen = openCat[cat] !== false;
        return (
          <div key={cat} style={{ maxWidth: 600, margin: "0 auto 8px" }}>
            <button onClick={() => setOpenCat(p => ({ ...p, [cat]: !isOpen }))} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6,
              cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ fontWeight: 700, fontSize: 12, fontFamily: fnt, color: meta.color }}>{meta.label} ({catDocs.length})</span>
              <span style={{ fontSize: 10, color: C.textMuted }}>{isOpen ? "▼" : "▶"}</span>
            </button>
            {isOpen && (
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                {catDocs.sort((a, b) => (b.lineCount || 0) - (a.lineCount || 0)).map(doc => (
                  <div key={doc.relativePath} style={{
                    padding: "6px 12px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 4,
                    borderLeft: `3px solid ${freshColor(doc.modifiedAt)}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 11, fontFamily: fnt, color: C.text }}>{doc.relativePath}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontFamily: fnt, color: C.textMuted }}>{doc.lineCount || 0} linhas</span>
                        <span style={{ fontSize: 9, fontFamily: fnt, color: freshColor(doc.modifiedAt), fontWeight: 700 }}>{freshLabel(doc.modifiedAt)}</span>
                      </div>
                    </div>
                    {doc.title && <div style={{ fontSize: 10, color: C.textSec, marginTop: 2 }}>{doc.title}</div>}
                    {doc.headings && doc.headings.length > 0 && (
                      <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {doc.headings.slice(0, 6).map((h, i) => (
                          <span key={i} style={{ fontSize: 8, fontFamily: fnt, color: C.textMuted, background: `${C.teal}08`, border: `1px solid ${C.teal}20`, borderRadius: 3, padding: "1px 5px" }}>{h}</span>
                        ))}
                        {doc.headings.length > 6 && <span style={{ fontSize: 8, color: C.textMuted }}>+{doc.headings.length - 6}</span>}
                      </div>
                    )}
                    {doc.tableRefs && doc.tableRefs.length > 0 && (
                      <div style={{ marginTop: 3, fontSize: 8, fontFamily: fnt, color: C.supabase }}>
                        DB refs: {doc.tableRefs.slice(0, 5).join(", ")}{doc.tableRefs.length > 5 ? ` +${doc.tableRefs.length - 5}` : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══ PORTAL: DEPS MATRIX ═══ */

function DepsMatrix() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deps").then(r => r.json()).then(d => { setData(d.data || d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 12, fontFamily: fnt }}>Carregando...</div>;
  if (!data) return <div style={{ textAlign: "center", padding: 40, color: C.red, fontSize: 12, fontFamily: fnt }}>Erro ao carregar dados</div>;

  const apps = data.nodes?.filter(n => n.type === "app") || [];
  const pkgs = data.nodes?.filter(n => n.type === "package") || [];
  const edges = data.edges || [];
  const orphans = data.orphans || [];
  const hubs = data.hubs || [];

  const edgeSet = new Set(edges.map(e => `${e.from}→${e.to}`));
  const runtimeColors = { nextjs: C.blue, expo: C.green, capacitor: C.indigo, unknown: C.textMuted };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 14, fontFamily: fnt, color: C.teal }}>GRAFO DE DEPENDÊNCIAS</span>
        <div style={{ color: C.textMuted, fontSize: 10, fontFamily: fnt, marginTop: 3 }}>
          {apps.length} apps · {pkgs.length} pkgs · {edges.length} edges
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        {[["Next.js", C.blue], ["Expo", C.green], ["Capacitor", C.indigo]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, fontFamily: fnt, color: C.textMuted }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <table style={{ borderCollapse: "collapse", margin: "0 auto", fontSize: 9, fontFamily: fnt }}>
          <thead>
            <tr>
              <th style={{ padding: "4px 8px", borderBottom: `2px solid ${C.border}`, textAlign: "left", color: C.textMuted, fontSize: 8 }}>App / Pkg →</th>
              {pkgs.map(p => (
                <th key={p.name} style={{
                  padding: "4px 4px", borderBottom: `2px solid ${C.border}`, textAlign: "center",
                  color: orphans.includes(p.name.replace("@onsite/", "")) ? C.red : hubs.some(h => h.name === p.name.replace("@onsite/", "")) ? C.amber : C.textMuted,
                  fontWeight: orphans.includes(p.name.replace("@onsite/", "")) ? 800 : 600,
                  fontSize: 8, writingMode: "vertical-rl", height: 70, maxWidth: 20,
                }}>
                  {p.name.replace("@onsite/", "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apps.map(app => {
              const rc = runtimeColors[app.runtime] || runtimeColors.unknown;
              return (
                <tr key={app.name}>
                  <td style={{ padding: "4px 8px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: rc, whiteSpace: "nowrap" }}>
                    {app.name.replace("@onsite/", "")}
                  </td>
                  {pkgs.map(p => {
                    const has = edgeSet.has(`${app.name}→${p.name}`);
                    return (
                      <td key={p.name} style={{
                        padding: "4px 4px", borderBottom: `1px solid ${C.border}`, textAlign: "center",
                        background: has ? `${rc}08` : "transparent",
                      }}>
                        {has ? <span style={{ color: rc, fontWeight: 800 }}>✓</span> : <span style={{ color: `${C.border}` }}>·</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Orphans + Hubs */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
        {orphans.length > 0 && (
          <div style={{ background: `${C.red}08`, border: `1px solid ${C.red}30`, borderRadius: 6, padding: "8px 14px" }}>
            <div style={{ fontWeight: 700, fontSize: 10, fontFamily: fnt, color: C.red, marginBottom: 4 }}>🔴 Órfãos ({orphans.length})</div>
            {orphans.map(o => <div key={o} style={{ fontSize: 9, color: C.textSec }}>@onsite/{o}</div>)}
          </div>
        )}
        {hubs.length > 0 && (
          <div style={{ background: `${C.amber}08`, border: `1px solid ${C.amber}30`, borderRadius: 6, padding: "8px 14px" }}>
            <div style={{ fontWeight: 700, fontSize: 10, fontFamily: fnt, color: C.amberDark, marginBottom: 4 }}>⚠️ Hubs ({hubs.length})</div>
            {hubs.map(h => <div key={h.name} style={{ fontSize: 9, color: C.textSec }}>@onsite/{h.name} ({h.consumers} apps)</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ PORTAL: MIGRATION TIMELINE ═══ */

function MigrationTimeline() {
  const [migrations, setMigrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/migrations").then(r => r.json()).then(d => { setMigrations(d.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 12, fontFamily: fnt }}>Carregando...</div>;

  const totalCreate = migrations.reduce((s, m) => s + (m.statements?.create_table || 0), 0);
  const totalPolicy = migrations.reduce((s, m) => s + (m.statements?.create_policy || 0), 0);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 14, fontFamily: fnt, color: C.teal }}>TIMELINE DE MIGRATIONS</span>
        <div style={{ color: C.textMuted, fontSize: 10, fontFamily: fnt, marginTop: 3 }}>
          {migrations.length} migrations · {totalCreate} CREATE TABLE · {totalPolicy} CREATE POLICY
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {migrations.slice().reverse().map((m, i) => {
          const st = m.statements || {};
          const total = Object.values(st).reduce((a, b) => a + b, 0);
          return (
            <div key={m.name} style={{ display: "flex", gap: 12, marginBottom: 2 }}>
              {/* Timeline dot + line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: total > 10 ? C.teal : C.border, border: `2px solid ${C.bgCard}`, boxShadow: `0 0 0 1px ${total > 10 ? C.teal : C.border}` }} />
                {i < migrations.length - 1 && <div style={{ width: 2, flex: 1, background: C.border, minHeight: 20 }} />}
              </div>
              {/* Content */}
              <div style={{ flex: 1, paddingBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: 11, fontFamily: fnt, color: C.text }}>{m.name}</span>
                  {m.date && <span style={{ fontSize: 9, fontFamily: fnt, color: C.textMuted }}>{m.date}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  {st.create_table > 0 && <span style={{ fontSize: 8, fontFamily: fnt, color: C.green, background: `${C.green}10`, border: `1px solid ${C.green}25`, borderRadius: 3, padding: "1px 6px" }}>{st.create_table} CREATE TABLE</span>}
                  {st.alter_table > 0 && <span style={{ fontSize: 8, fontFamily: fnt, color: C.blue, background: `${C.blue}10`, border: `1px solid ${C.blue}25`, borderRadius: 3, padding: "1px 6px" }}>{st.alter_table} ALTER</span>}
                  {st.create_policy > 0 && <span style={{ fontSize: 8, fontFamily: fnt, color: C.purple, background: `${C.purple}10`, border: `1px solid ${C.purple}25`, borderRadius: 3, padding: "1px 6px" }}>{st.create_policy} POLICY</span>}
                  {st.create_function > 0 && <span style={{ fontSize: 8, fontFamily: fnt, color: C.cyan, background: `${C.cyan}10`, border: `1px solid ${C.cyan}25`, borderRadius: 3, padding: "1px 6px" }}>{st.create_function} FUNCTION</span>}
                  {st.create_view > 0 && <span style={{ fontSize: 8, fontFamily: fnt, color: C.indigo, background: `${C.indigo}10`, border: `1px solid ${C.indigo}25`, borderRadius: 3, padding: "1px 6px" }}>{st.create_view} VIEW</span>}
                  {st.create_index > 0 && <span style={{ fontSize: 8, fontFamily: fnt, color: C.amberDark, background: `${C.amber}10`, border: `1px solid ${C.amber}25`, borderRadius: 3, padding: "1px 6px" }}>{st.create_index} INDEX</span>}
                  {st.drop > 0 && <span style={{ fontSize: 8, fontFamily: fnt, color: C.red, background: `${C.red}10`, border: `1px solid ${C.red}25`, borderRadius: 3, padding: "1px 6px" }}>{st.drop} DROP</span>}
                </div>
                {m.tables_created && m.tables_created.length > 0 && (
                  <div style={{ fontSize: 8, fontFamily: fnt, color: C.textMuted, marginTop: 3 }}>
                    Tabelas: {m.tables_created.slice(0, 5).join(", ")}{m.tables_created.length > 5 ? ` +${m.tables_created.length - 5}` : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ PORTAL: HEALTH CHECKS ═══ */

function HealthChecks() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: C.textMuted, fontSize: 12, fontFamily: fnt }}>Carregando...</div>;
  if (!data) return <div style={{ textAlign: "center", padding: 40, color: C.red, fontSize: 12, fontFamily: fnt }}>Erro ao carregar dados</div>;

  const findings = data.findings || [];
  const summary = data.summary || {};

  const sevColor = { critical: C.red, warning: C.amber, info: C.blue };
  const sevIcon = { critical: "🔴", warning: "⚠️", info: "ℹ️" };
  const sevLabel = { critical: "CRÍTICO", warning: "AVISO", info: "INFO" };

  const grouped = {};
  for (const f of findings) {
    if (!grouped[f.severity]) grouped[f.severity] = [];
    grouped[f.severity].push(f);
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 14, fontFamily: fnt, color: C.teal }}>SAÚDE DO SISTEMA</span>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 6 }}>
          {summary.critical > 0 && <span style={{ fontSize: 10, fontFamily: fnt, color: C.red, fontWeight: 700 }}>{summary.critical} críticos</span>}
          {summary.warning > 0 && <span style={{ fontSize: 10, fontFamily: fnt, color: C.amberDark, fontWeight: 700 }}>{summary.warning} avisos</span>}
          {summary.info > 0 && <span style={{ fontSize: 10, fontFamily: fnt, color: C.blue }}>{summary.info} info</span>}
          {findings.length === 0 && <span style={{ fontSize: 10, fontFamily: fnt, color: C.green, fontWeight: 700 }}>✅ Tudo limpo!</span>}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {["critical", "warning", "info"].map(sev => {
          const items = grouped[sev];
          if (!items || items.length === 0) return null;
          return (
            <div key={sev} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 11, fontFamily: fnt, color: sevColor[sev], marginBottom: 6 }}>
                {sevIcon[sev]} {sevLabel[sev]} ({items.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((f, i) => (
                  <div key={i} style={{
                    padding: "10px 14px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6,
                    borderLeft: `3px solid ${sevColor[sev]}`,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 11, fontFamily: fnt, color: C.text }}>{f.title}</div>
                    <div style={{ fontSize: 10, color: C.textSec, marginTop: 3, lineHeight: 1.5 }}>{f.description}</div>
                    <div style={{ fontSize: 9, fontFamily: fnt, color: C.teal, marginTop: 4, fontStyle: "italic" }}>💡 {f.suggestion}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */

export default function App() {
  const [modalPkg, setModalPkg] = useState(null);
  const [appModal, setAppModal] = useState(null);
  const [techModal, setTechModal] = useState(null);
  const [techSection, setTechSection] = useState("overview");
  const [mode, setMode] = useState("pitch");
  const [pitchTab, setPitchTab] = useState("eco");
  const [engTab, setEngTab] = useState("arch");
  const [portalTab, setPortalTab] = useState("docs");

  // Live data from APIs (overlays hardcoded defaults)
  const [liveApps, setLiveApps] = useState(null);
  const [livePkgs, setLivePkgs] = useState(null);
  const [liveSchema, setLiveSchema] = useState(null);
  const [dataSource, setDataSource] = useState("static");

  useEffect(() => {
    Promise.all([
      fetch("/api/apps").then(r => r.json()).catch(() => null),
      fetch("/api/packages").then(r => r.json()).catch(() => null),
      fetch("/api/schema").then(r => r.json()).catch(() => null),
    ]).then(([apps, pkgs, schema]) => {
      if (apps?.data) setLiveApps(apps.data);
      if (pkgs?.data) setLivePkgs(pkgs.data);
      if (schema?.groups) setLiveSchema(schema);
      const src = schema?.source === "live" ? "live" : (apps?.data || pkgs?.data) ? "snapshot" : "static";
      setDataSource(src);
    });
  }, []);

  // Merged data: real facts + rich descriptions
  const rows = liveApps ? mergeRows(ROWS, liveApps) : ROWS;
  const pkgs = livePkgs ? mergePkgs(PKGS, livePkgs) : PKGS;
  const schema = liveSchema?.groups ? mergeSchema(SCHEMA_DATA, liveSchema) : SCHEMA_DATA;

  const hlPkgs = appModal?.deps || null;
  const rowCount = rows.length;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Segoe UI', -apple-system, sans-serif", padding: "20px 16px", maxWidth: 800, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <PkgModal pkg={modalPkg} onClose={() => setModalPkg(null)} allRows={rows} />
      <AppModal app={appModal} onClose={() => setAppModal(null)} />
      <TechModal tab={techModal} section={techSection} setSection={setTechSection} onClose={() => { setTechModal(null); setTechSection("overview"); }} />

      {/* ═══ HEADER ═══ */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <img src="/logo.png" alt="OnSite Club" style={{ height: 44, objectFit: "contain", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.amberBg, border: `1px solid ${C.amber}30`, borderRadius: 6, padding: "3px 12px", marginTop: 8 }}>
          <span style={{ fontSize: 13 }}>{"\uD83E\uDD85"}</span>
          <span style={{ color: C.amberDark, fontWeight: 800, fontSize: 13, fontFamily: fnt }}>EAGLE MONOREPO</span>
        </div>
        <p style={{ color: C.textMuted, fontSize: 10, fontFamily: fnt, margin: "6px 0 0" }}>
          Turborepo · Node ≥20 · TS 5.x · {rows.flatMap(r => r.apps).length} apps · {pkgs.length} packages
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: dataSource === "live" ? C.green : dataSource === "snapshot" ? C.amber : C.red }} />
          <span style={{ fontSize: 9, fontFamily: fnt, color: C.textMuted }}>
            {dataSource === "live" ? "Dados Live (Supabase)" : dataSource === "snapshot" ? "Snapshot (filesystem)" : "Estático (hardcoded)"}
          </span>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: "flex", gap: 0, marginTop: 12, background: C.bgCard, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {[
            { id: "pitch", label: "💼 Pitch", desc: "Investidores" },
            { id: "eng", label: "⚙️ Engenharia", desc: "Devs & CTOs" },
            { id: "portal", label: "🔍 Portal", desc: "Interno" },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              padding: "8px 20px", border: "none", cursor: "pointer",
              background: mode === m.id ? C.amberBg : "transparent",
              borderBottom: mode === m.id ? `2px solid ${C.amber}` : "2px solid transparent",
              transition: "all 0.15s",
            }}>
              <div style={{ fontWeight: 700, fontSize: 12, fontFamily: fnt, color: mode === m.id ? C.amberDark : C.textMuted }}>{m.label}</div>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {mode === "pitch" ? (
            <>
              {[
                { id: "eco", label: "Ecossistema" },
                { id: "vision", label: "Visão 2037" },
              ].map(tab => (
                <button key={tab.id} onClick={() => setPitchTab(tab.id)} style={{
                  padding: "6px 16px", borderRadius: 6, border: `1px solid ${pitchTab === tab.id ? C.amber : C.border}`,
                  background: pitchTab === tab.id ? `${C.amber}10` : C.bgCard, cursor: "pointer",
                  fontWeight: 600, fontSize: 11, fontFamily: fnt,
                  color: pitchTab === tab.id ? C.amberDark : C.textMuted,
                }}>{tab.label}</button>
              ))}
            </>
          ) : mode === "eng" ? (
            <>
              {[
                { id: "arch", label: "Arquitetura Técnica" },
                { id: "supabase", label: "Supabase Explorer" },
              ].map(tab => (
                <button key={tab.id} onClick={() => setEngTab(tab.id)} style={{
                  padding: "6px 16px", borderRadius: 6, border: `1px solid ${engTab === tab.id ? C.blue : C.border}`,
                  background: engTab === tab.id ? `${C.blue}10` : C.bgCard, cursor: "pointer",
                  fontWeight: 600, fontSize: 11, fontFamily: fnt,
                  color: engTab === tab.id ? C.blue : C.textMuted,
                }}>{tab.label}</button>
              ))}
            </>
          ) : (
            <>
              {[
                { id: "docs", label: "📄 Docs" },
                { id: "deps", label: "🔗 Dependências" },
                { id: "migrations", label: "📜 Migrations" },
                { id: "health", label: "🏥 Saúde" },
              ].map(tab => (
                <button key={tab.id} onClick={() => setPortalTab(tab.id)} style={{
                  padding: "6px 16px", borderRadius: 6, border: `1px solid ${portalTab === tab.id ? C.teal : C.border}`,
                  background: portalTab === tab.id ? `${C.teal}10` : C.bgCard, cursor: "pointer",
                  fontWeight: 600, fontSize: 11, fontFamily: fnt,
                  color: portalTab === tab.id ? C.teal : C.textMuted,
                }}>{tab.label}</button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ═══ PITCH: ECOSSISTEMA ═══ */}
      {mode === "pitch" && pitchTab === "eco" && (<>

        {/* External ecosystem */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ color: C.amberDark, fontSize: 9, fontWeight: 700, fontFamily: fnt, letterSpacing: 1.5, marginBottom: 8 }}>ECOSSISTEMA EXTERNO</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            {EXTERNAL.map(a => (
              <div key={a.id} style={{ background: C.amberBg, border: `1.5px dashed ${C.amber}50`, borderRadius: 9, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: fnt }}>{a.name}</div>
                  <div style={{ color: C.textMuted, fontSize: 10, fontFamily: fnt }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ color: C.textMuted, fontSize: 8, fontFamily: fnt, marginTop: 5 }}>fora do monorepo \u00B7 mesmo Supabase</div>
        </div>

        {/* Connector */}
        <div style={{ display: "flex", justifyContent: "center", margin: "2px 0 6px" }}>
          <svg width="160" height="20" viewBox="0 0 160 20">
            <line x1="40" y1="0" x2="80" y2="18" stroke={C.amber} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.4" />
            <line x1="120" y1="0" x2="80" y2="18" stroke={C.amber} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.4" />
            <circle cx="80" cy="18" r="2" fill={C.amber} opacity="0.5" />
          </svg>
        </div>

        {/* ══ TRIANGLE FUNNEL ══ */}
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,0 100,0 62,100 38,100" fill="none" stroke={C.amber} strokeWidth="0.3" opacity="0.25" strokeDasharray="1 0.8" />
          </svg>

          <div style={{ position: "relative", zIndex: 1 }}>
            {rows.map((row, ri) => {
              const insets = [0, 10, 18];
              const inset = insets[ri] || 0;
              const cols = ri === 0 ? 3 : row.apps.length;
              return (
                <div key={row.label} style={{ padding: `0 ${inset}%`, marginBottom: ri < rowCount - 1 ? 8 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, paddingLeft: 2 }}>
                    <span style={{ background: `${row.color}12`, border: `1px solid ${row.color}30`, borderRadius: 4, padding: "1px 8px", fontSize: 10, fontWeight: 700, fontFamily: fnt, color: row.color, lineHeight: "20px" }}>{row.label}</span>
                    <span style={{ color: C.textMuted, fontSize: 10 }}>{row.version}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
                    {row.apps.map(app => (
                      <div key={app.id} onClick={() => !app.isPlanned && setAppModal(app)} style={{
                        background: C.bgCard,
                        border: `1.5px ${app.isPlanned ? "dashed" : "solid"} ${app.isPlanned ? `${C.planned}50` : C.border}`,
                        borderRadius: 9, padding: "12px 12px 10px", cursor: app.isPlanned ? "default" : "pointer",
                        opacity: app.isPlanned ? 0.5 : 1,
                        transition: "all 0.2s", position: "relative",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                          <div style={{ width: 9, height: 9, borderRadius: "50%", background: app.color, flexShrink: 0 }} />
                          <span style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: fnt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{app.name}</span>
                          {app.isNew && <Badge variant="new">NOVO</Badge>}
                          {app.isPlanned && <Badge variant="planned">TBD</Badge>}
                          {!app.isNew && !app.isPlanned && <StatusBadge status={app.status} />}
                        </div>
                        <div style={{ color: C.textMuted, fontSize: 10, fontFamily: fnt, marginLeft: 14 }}>{app.sub}</div>
                        <div style={{ marginLeft: 14 }}>
                          <ProgressBar value={app.progress} color={app.color} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Funnel tip arrow */}
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
          <svg width="36" height="18" viewBox="0 0 36 18"><path d="M8 2 L18 14 L28 2" stroke={C.amber} strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </div>

        {/* ══ PACKAGES ══ */}
        <div style={{ position: "relative", marginBottom: 4 }}>
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="10,0 90,0 58,100 42,100" fill="none" stroke={C.amber} strokeWidth="0.25" opacity="0.2" strokeDasharray="1 1" />
          </svg>
          <div style={{ position: "relative", zIndex: 1, padding: "14px 4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ color: C.amberDark, fontWeight: 700, fontSize: 14, fontFamily: fnt }}>PACKAGES</span>
              <span style={{ color: C.textMuted, fontSize: 11 }}>17 internos</span>
            </div>

            {/* Funda\u00E7\u00E3o */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: C.amberDark, fontSize: 8, fontWeight: 700, fontFamily: fnt, marginBottom: 6, letterSpacing: 1, textAlign: "center" }}>{"\u25A0"} FUNDA\u00C7\u00C3O</div>
              {(() => {
                const fPkgs = pkgs.filter(p => p.layer === "f");
                const pkgRows = [fPkgs.slice(0, 5), fPkgs.slice(5, 9), fPkgs.slice(9)];
                const paddings = ["0 4%", "0 12%", "0 25%"];
                return pkgRows.map((pr, i) => (
                  <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 4, padding: paddings[i] }}>
                    {pr.map(p => {
                      const hl = hlPkgs ? hlPkgs.includes(p.id) : null;
                      return (
                        <button key={p.id} onClick={() => setModalPkg(p)} style={{
                          background: hl ? `${C.amber}12` : C.bgCard,
                          border: `1px solid ${hl ? C.amber : C.border}`,
                          borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                          opacity: hl === false ? 0.3 : 1, transition: "all 0.2s",
                          fontFamily: fnt, fontSize: 12, fontWeight: 600, color: hl ? C.amberDark : C.text,
                          boxShadow: hl ? `0 1px 4px ${C.amber}15` : "none",
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <div style={{ width: 4, height: 4, borderRadius: 1, background: C.amberDark, flexShrink: 0 }} />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>

            {/* Composi\u00E7\u00E3o */}
            <div>
              <div style={{ color: C.cyan, fontSize: 8, fontWeight: 700, fontFamily: fnt, marginBottom: 6, letterSpacing: 1, textAlign: "center" }}>{"\u25CF"} COMPOSI\u00C7\u00C3O</div>
              {(() => {
                const cPkgs = pkgs.filter(p => p.layer === "c");
                const pkgRows = [cPkgs.slice(0, 4), cPkgs.slice(4)];
                const paddings = ["0 14%", "0 22%"];
                return pkgRows.map((pr, i) => (
                  <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 4, padding: paddings[i] }}>
                    {pr.map(p => {
                      const hl = hlPkgs ? hlPkgs.includes(p.id) : null;
                      return (
                        <button key={p.id} onClick={() => setModalPkg(p)} style={{
                          background: hl ? `${C.cyan}10` : C.bgCard,
                          border: `1px solid ${hl ? C.cyan : C.border}`,
                          borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                          opacity: hl === false ? 0.3 : 1, transition: "all 0.2s",
                          fontFamily: fnt, fontSize: 12, fontWeight: 600, color: hl ? C.cyan : C.text,
                          boxShadow: hl ? `0 1px 4px ${C.cyan}15` : "none",
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.cyan, flexShrink: 0 }} />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Funnel tip to Supabase */}
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
          <svg width="36" height="18" viewBox="0 0 36 18"><path d="M8 2 L18 14 L28 2" stroke={C.supabase} strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </div>

        {/* Supabase + DB CTA */}
        <div style={{
          background: C.supabaseBg, border: `2px solid ${C.supabase}40`,
          borderRadius: 12, padding: "14px 20px", textAlign: "center",
          boxShadow: `0 4px 16px ${C.supabase}10`, maxWidth: 420, margin: "0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 3 }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: C.supabase, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 800 }}>{"\u26A1"}</div>
            <span style={{ color: C.supabase, fontWeight: 800, fontSize: 14, fontFamily: fnt }}>SUPABASE</span>
          </div>
          <p style={{ color: C.textSec, fontSize: 9, fontFamily: fnt, margin: "2px 0 0" }}>Cerbero \u00B7 PostgreSQL + RLS + Auth + Realtime + Storage</p>
          <button onClick={() => { setMode("eng"); setEngTab("supabase"); }} style={{
            marginTop: 10, background: C.bgCard, border: `1px solid ${C.supabase}30`,
            borderRadius: 6, padding: "6px 16px", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 10 }}>{"\uD83D\uDDC4\uFE0F"}</span>
            <span style={{ color: C.supabase, fontWeight: 700, fontSize: 10, fontFamily: fnt }}>Explorar Schema · {schema.reduce((s,g) => s+g.t.length, 0)} tables · {schema.length} grupos</span>
          </button>
        </div>

        <p style={{ textAlign: "center", color: C.textMuted, fontSize: 9, fontFamily: fnt, marginTop: 14, fontStyle: "italic" }}>
          Clique em um app para ver detalhes · Clique em um package para ver dependentes
        </p>
      </>)}

      {/* ═══ PITCH: VISÃO 2037 ═══ */}
      {mode === "pitch" && pitchTab === "vision" && <VisaoTab />}

      {/* ═══ ENG: ARQUITETURA TÉCNICA ═══ */}
      {mode === "eng" && engTab === "arch" && (
        <div style={{ marginTop: 8 }}>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <span style={{ color: C.dark, fontWeight: 800, fontSize: 11, fontFamily: fnt, letterSpacing: 1.5 }}>TECHNICAL DEEP DIVE</span>
            <p style={{ color: C.textMuted, fontSize: 9, fontFamily: fnt, margin: "3px 0 0" }}>investigação real do monorepo · dados atualizados</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, maxWidth: 700, margin: "0 auto" }}>
            {TECH_TABS.map(tab => (
              <button key={tab.id} onClick={() => { setTechModal(tab); setTechSection("overview"); }} style={{
                background: C.bgCard, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "12px 8px 10px",
                cursor: "pointer", transition: "all 0.2s", textAlign: "center", borderTop: `2.5px solid ${tab.color}`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{tab.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 11, fontFamily: fnt, color: C.text, marginBottom: 3, lineHeight: 1.3 }}>{tab.name}</div>
                <div style={{ color: C.textMuted, fontSize: 8, fontFamily: fnt, lineHeight: 1.4 }}>{tab.summary.split(" · ")[0]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ENG: SUPABASE EXPLORER ═══ */}
      {mode === "eng" && engTab === "supabase" && <SupabaseExplorer schemaData={schema} />}

      {/* ═══ PORTAL TABS ═══ */}
      {mode === "portal" && portalTab === "docs" && <DocBrowser />}
      {mode === "portal" && portalTab === "deps" && <DepsMatrix />}
      {mode === "portal" && portalTab === "migrations" && <MigrationTimeline />}
      {mode === "portal" && portalTab === "health" && <HealthChecks />}

      {/* ═══ PITCH: INTELIGÊNCIA (part of Ecossistema) ═══ */}
      {mode === "pitch" && pitchTab === "eco" && (
      <>
      {/* ═══ INTELIGÊNCIA ═══ */}
      {(() => {
        const OUTPUT_ROWS = [
          { label: "PRUMO IA", version: "2027+ \u00B7 modelo propriet\u00E1rio", color: C.purple, apps: [
            { id: "prumo-core", name: "Prumo Core", sub: "modelo base", color: C.purple, desc: "IA treinada com dados reais de canteiro canadense \u2014 horas, fotos, custos, clima, equipes.", tech: "ML \u00B7 Computer Vision \u00B7 NLP" },
          ]},
          { label: "PRODUTOS IA", version: "apps inteligentes", color: C.amberDark, apps: [
            { id: "predictor", name: "Predictor", sub: "previs\u00E3o de obra", color: C.amberDark, desc: "Prev\u00EA custo, prazo e risco de uma obra baseado no hist\u00F3rico real.", tech: "ML \u00B7 time-series \u00B7 weather API" },
            { id: "safety-ai", name: "Safety AI", sub: "risco & compliance", color: C.red, desc: "Score de seguran\u00E7a por site, alertas preditivos, an\u00E1lise de fotos.", tech: "Computer Vision \u00B7 anomaly detection" },
            { id: "crew-optimizer", name: "Crew Optimizer", sub: "equipes ideais", color: C.green, desc: "Sugere composi\u00E7\u00E3o ideal de equipe por tipo de obra, fase e regi\u00E3o.", tech: "Optimization \u00B7 worker profiles" },
          ]},
          { label: "MARKETPLACE", version: "venda de dados & insights", color: C.blue, apps: [
            { id: "insurance-api", name: "Insurance API", sub: "seguradoras", color: C.blue, desc: "API de risco por site/worker/trade para precifica\u00E7\u00E3o de seguro.", tech: "Risk scoring \u00B7 real-time API" },
            { id: "benchmark", name: "Benchmark", sub: "contractors", color: C.teal, desc: "Compara\u00E7\u00E3o de custo e prazo vs mercado por prov\u00EDncia.", tech: "Aggregated analytics" },
            { id: "gov-data", name: "Gov Data", sub: "governo", color: C.purple, desc: "Dados agregados e anonimizados de workforce por regi\u00E3o.", tech: "Anonymized datasets" },
            { id: "marketing-ai", name: "Marketing AI", sub: "ads", color: C.pink, desc: "Targeting de produtos baseado em perfil de worker.", tech: "Segmentation \u00B7 recommendation" },
          ]},
          { label: "EXPANS\u00C3O", version: "scale & licensing", color: C.dark, apps: [
            { id: "prumo-api", name: "Prumo API", sub: "plataforma", color: C.dark, desc: "API p\u00FAblica para terceiros usando modelos Prumo.", tech: "REST \u00B7 SDK" },
            { id: "intl", name: "Intl Expansion", sub: "global", color: C.amberDark, desc: "Replicar modelo OnSite em outros mercados.", tech: "Multi-region" },
            { id: "white-label", name: "White Label", sub: "licenciamento", color: C.indigo, desc: "Licenciar a stack para grandes construtoras.", tech: "Enterprise \u00B7 SaaS" },
            { id: "training", name: "Training Data", sub: "dataset", color: C.cyan, desc: "Venda de datasets anonimizados.", tech: "Data licensing" },
            { id: "metaverse", name: "Digital Twin", sub: "simula\u00E7\u00E3o", color: C.purple, desc: "G\u00EAmeos digitais alimentados com dados reais.", tech: "3D \u00B7 BIM" },
          ]},
        ];

        return (
          <div style={{ marginTop: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <span style={{ color: C.purple, fontWeight: 800, fontSize: 11, fontFamily: fnt, letterSpacing: 1.5 }}>INTELIG\u00CANCIA</span>
              <p style={{ color: C.textMuted, fontSize: 9, fontFamily: fnt, margin: "3px 0 0" }}>anos de dados acumulados \u2192 produtos de IA</p>
            </div>

            <div style={{ display: "flex", justifyContent: "center", padding: "2px 0 6px" }}>
              <svg width="36" height="18" viewBox="0 0 36 18"><path d="M10 2 L18 14 L26 2" stroke={C.purple} strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            </div>

            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon points="35,0 65,0 98,100 2,100" fill="none" stroke={C.purple} strokeWidth="0.3" opacity="0.2" strokeDasharray="1 0.8" />
              </svg>

              <div style={{ position: "relative", zIndex: 1 }}>
                {OUTPUT_ROWS.map((row, ri) => {
                  const maxInset = 15;
                  const inset = maxInset - (ri * (maxInset / (OUTPUT_ROWS.length - 1 || 1)));
                  return (
                    <div key={row.label} style={{ padding: `0 ${inset}%`, marginBottom: ri < OUTPUT_ROWS.length - 1 ? 6 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, paddingLeft: 2 }}>
                        <span style={{ background: `${row.color}12`, border: `1px solid ${row.color}30`, borderRadius: 3, padding: "0 7px", fontSize: 9, fontWeight: 700, fontFamily: fnt, color: row.color, lineHeight: "18px" }}>{row.label}</span>
                        <span style={{ color: C.textMuted, fontSize: 9 }}>{row.version}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${row.apps.length}, 1fr)`, gap: 5 }}>
                        {row.apps.map(app => (
                          <div key={app.id} style={{
                            background: C.bgCard, border: `1.5px solid ${C.border}`,
                            borderRadius: 8, padding: "8px 8px 7px", position: "relative",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                            borderTop: `2.5px solid ${app.color}`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                              <div style={{ width: 7, height: 7, borderRadius: "50%", background: app.color, flexShrink: 0 }} />
                              <span style={{ color: C.text, fontWeight: 700, fontSize: 11, fontFamily: fnt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.name}</span>
                            </div>
                            <div style={{ color: C.textMuted, fontSize: 9, fontFamily: fnt, marginLeft: 11, marginBottom: 4 }}>{app.sub}</div>
                            <div style={{ color: C.textSec, fontSize: 9, lineHeight: 1.4, marginBottom: 3 }}>{app.desc}</div>
                            <div style={{ color: C.textMuted, fontSize: 8, fontFamily: fnt, fontStyle: "italic" }}>{app.tech}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 14 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${C.dark}08`, border: `1px solid ${C.dark}15`, borderRadius: 8, padding: "8px 18px" }}>
                <span style={{ fontSize: 14 }}>{"\uD83C\uDFF0"}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 800, fontSize: 11, fontFamily: fnt, color: C.dark }}>DATA MOAT</div>
                  <div style={{ color: C.textMuted, fontSize: 9 }}>Dados reais + network effect + vertical integration = imposs\u00EDvel de copiar</div>
                </div>
              </div>
            </div>

            <p style={{ textAlign: "center", color: C.textMuted, fontSize: 9, fontFamily: fnt, marginTop: 12, fontStyle: "italic" }}>
              Cada output \u00E9 um produto/neg\u00F3cio futuro constru\u00EDdo sobre os dados coletados pelos apps acima
            </p>
          </div>
        );
      })()}
      </>)}

      <div style={{ textAlign: "center", marginTop: 28, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 6 }}>
          <a href="/investor" style={{ color: C.amberDark, fontSize: 10, fontFamily: fnt, textDecoration: "none" }}>{"\uD83D\uDCCA"} Investor Dashboard</a>
        </div>
        <span style={{ color: C.textMuted, fontSize: 9, fontFamily: fnt }}>OnSite Eagle \u00B7 Architecture \u00B7 {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
