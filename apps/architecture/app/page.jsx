"use client";
import { useState } from "react";

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

const DB = [
  { p: "core_*", l: "Identidade", d: "profiles, devices, orgs, consents" },
  { p: "egl_*", l: "Eagle", d: "sites, houses, photos, progress, timeline" },
  { p: "tmk_*", l: "Timekeeper", d: "entries, geofences, projects" },
  { p: "ccl_*", l: "Calculator", d: "calculations, templates" },
  { p: "pay_*", l: "Payments", d: "invoices, house_payments", isNew: true },
  { p: "shp_*", l: "Shop", d: "products, orders, carts" },
  { p: "bil_*", l: "Billing", d: "subscriptions, products, payments" },
  { p: "ref_*", l: "Refer\u00EAncia", d: "trades, provinces, units, phases" },
  { p: "log_*", l: "Logs", d: "errors, events, locations" },
  { p: "agg_*", l: "Agrega\u00E7\u00F5es", d: "platform_daily, trade_weekly, user_daily" },
  { p: "int_*", l: "Intelig\u00EAncia", d: "worker/lot profiles, delay attributions" },
  { p: "club_*", l: "Club", d: "badges, campaigns, streaks, news", isNew: true },
  { p: "sch_*", l: "SheetChat", d: "posts, follows", isPlanned: true },
  { p: "v_*", l: "Views", d: "churn, mrr, health, schedule_status" },
];

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

function PkgModal({ pkg, onClose }) {
  if (!pkg) return null;
  const allApps = ROWS.flatMap(r => r.apps);
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

/* ═══ MAIN PAGE ═══ */

export default function App() {
  const [modalPkg, setModalPkg] = useState(null);
  const [appModal, setAppModal] = useState(null);
  const [dbModal, setDbModal] = useState(false);

  const hlPkgs = appModal?.deps || null;
  const rowCount = ROWS.length;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Segoe UI', -apple-system, sans-serif", padding: "20px 16px", maxWidth: 800, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <PkgModal pkg={modalPkg} onClose={() => setModalPkg(null)} />
      <AppModal app={appModal} onClose={() => setAppModal(null)} />

      {/* ═══ HEADER ═══ */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <img src="/logo.png" alt="OnSite Club" style={{ height: 44, objectFit: "contain", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.amberBg, border: `1px solid ${C.amber}30`, borderRadius: 6, padding: "3px 12px", marginTop: 8 }}>
          <span style={{ fontSize: 13 }}>{"\uD83E\uDD85"}</span>
          <span style={{ color: C.amberDark, fontWeight: 800, fontSize: 13, fontFamily: fnt }}>EAGLE MONOREPO</span>
        </div>
        <p style={{ color: C.textMuted, fontSize: 10, fontFamily: fnt, margin: "6px 0 0" }}>Turborepo \u00B7 Node \u226520 \u00B7 TS 5.x \u00B7 11 apps + 1 planejado \u00B7 17 packages</p>
      </div>

      {/* ═══ DATABASE MODAL ═══ */}
      {dbModal && (
        <div onClick={() => setDbModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 14, padding: 20, maxWidth: 520, width: "92%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", border: `1px solid ${C.supabase}30` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: C.supabase, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 800 }}>{"\u26A1"}</div>
                <span style={{ color: C.supabase, fontWeight: 800, fontSize: 14, fontFamily: fnt }}>PostgreSQL Schema</span>
              </div>
              <button onClick={() => setDbModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textMuted, padding: 4 }}>{"\u2715"}</button>
            </div>
            <p style={{ color: C.textMuted, fontSize: 10, fontFamily: fnt, margin: "0 0 12px" }}>40+ tables \u00B7 RLS em todas \u00B7 Multi-tenant via organization_id</p>
            <div style={{ display: "grid", gap: 5 }}>
              {DB.map(item => (
                <div key={item.p} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
                  background: C.bgCard, borderRadius: 6,
                  border: `1px ${item.isPlanned ? "dashed" : "solid"} ${item.isNew ? `${C.teal}40` : item.isPlanned ? `${C.planned}40` : C.border}`,
                  opacity: item.isPlanned ? 0.5 : 1,
                }}>
                  <code style={{ color: item.isNew ? C.teal : item.isPlanned ? C.planned : C.supabase, fontFamily: fnt, fontSize: 11, fontWeight: 700, minWidth: 48 }}>{item.p}</code>
                  <span style={{ color: C.text, fontSize: 11, fontWeight: 600 }}>{item.l}</span>
                  {item.isNew && <Badge variant="new">NOVO</Badge>}
                  {item.isPlanned && <Badge variant="planned">TBD</Badge>}
                  <span style={{ color: C.textMuted, fontSize: 9 }}>{item.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ARQUITETURA (top half of hourglass) ═══ */}
      <>
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
            {ROWS.map((row, ri) => {
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
                const fPkgs = PKGS.filter(p => p.layer === "f");
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
                const cPkgs = PKGS.filter(p => p.layer === "c");
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
          <button onClick={() => setDbModal(true)} style={{
            marginTop: 10, background: C.bgCard, border: `1px solid ${C.supabase}30`,
            borderRadius: 6, padding: "6px 16px", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 10 }}>{"\uD83D\uDDC4\uFE0F"}</span>
            <span style={{ color: C.supabase, fontWeight: 700, fontSize: 10, fontFamily: fnt }}>Ver Schema \u00B7 40+ tables \u00B7 {DB.length} prefixos</span>
          </button>
        </div>

        <p style={{ textAlign: "center", color: C.textMuted, fontSize: 9, fontFamily: fnt, marginTop: 14, fontStyle: "italic" }}>
          Clique em um app para ver detalhes \u00B7 Clique em um package para ver dependentes
        </p>
      </>

      {/* ═══ INTELIG\u00CANCIA ═══ */}
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

      <div style={{ textAlign: "center", marginTop: 28, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 6 }}>
          <a href="/investor" style={{ color: C.amberDark, fontSize: 10, fontFamily: fnt, textDecoration: "none" }}>{"\uD83D\uDCCA"} Investor Dashboard</a>
        </div>
        <span style={{ color: C.textMuted, fontSize: 9, fontFamily: fnt }}>OnSite Eagle \u00B7 Architecture \u00B7 {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
