'use client';

const C = {
  bg: '#FAFAF8', bgCard: '#FFFFFF', border: '#E8E5DD',
  amber: '#F5A623', amberDark: '#D4891A', amberBg: '#FEF9ED',
  dark: '#1A1A1A', green: '#2BA84A', blue: '#2563EB', purple: '#7C3AED',
  text: '#1A1A1A', textSec: '#5C5C5C', textMuted: '#9CA3AF',
  supabase: '#3ECF8E', teal: '#0D9488',
};

const fnt = "'JetBrains Mono', monospace";

const PLACEHOLDER_KPIS = [
  { label: 'Apps Live', value: '11', trend: '+1 este mês (Sheets)', color: C.green },
  { label: 'Apps Planejados', value: '2', trend: 'SheetChat, Academy', color: C.amber },
  { label: 'Packages', value: '17', trend: 'internos compartilhados', color: C.blue },
  { label: 'DB Tables', value: '40+', trend: 'RLS em todas', color: C.supabase },
];

const PRUMO_PROGRESS = [
  { label: 'Horas de trabalho', pct: 8, color: C.green, target: '500K horas', current: '~40K' },
  { label: 'Fotos de obra', pct: 5, color: '#DC2626', target: '1M fotos', current: '~50K' },
  { label: 'Cálculos', pct: 3, color: '#4F46E5', target: '200K cálculos', current: '~6K' },
  { label: 'Pagamentos registrados', pct: 0, color: C.teal, target: '100K transações', current: '0 (em dev)' },
  { label: 'Interações sociais', pct: 0, color: C.textMuted, target: '5M posts', current: 'planejado (SheetChat)' },
];

const TIMELINE = [
  { date: '2025', event: 'Ecossistema concebido. Primeiro app: Calculator.' },
  { date: 'Jan 2026', event: 'Monorepo Eagle criado. 6 apps migrados.' },
  { date: 'Fev 2026', event: '11 apps live. Sheets, Payments em dev. Multi-tenant implementado.' },
  { date: '2027', event: 'Meta: Prumo v0.1 — primeiro modelo treinado com dados reais.' },
  { date: '2028+', event: 'Marketplace, White Label, Kepler K2 robotics integration.' },
];

export default function InvestorDashboard() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Segoe UI', sans-serif", padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="/logo.png" alt="OnSite Club" style={{ height: 36, marginBottom: 8 }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.amberBg, border: `1px solid ${C.amber}30`, borderRadius: 6, padding: '3px 12px' }}>
          <span style={{ fontSize: 13 }}>📊</span>
          <span style={{ color: C.amberDark, fontWeight: 800, fontSize: 13, fontFamily: fnt }}>INVESTOR DASHBOARD</span>
        </div>
        <p style={{ color: C.textMuted, fontSize: 11, fontFamily: fnt, marginTop: 6 }}>
          Painel em tempo real do ecossistema OnSite Club — construção civil, Canada
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        {PLACEHOLDER_KPIS.map(k => (
          <div key={k.label} style={{
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '14px 12px', borderTop: `3px solid ${k.color}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ color: C.textMuted, fontSize: 9, fontFamily: fnt, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ color: C.text, fontSize: 28, fontWeight: 800, fontFamily: fnt, lineHeight: 1 }}>{k.value}</div>
            <div style={{ color: k.color, fontSize: 9, fontFamily: fnt, marginTop: 4 }}>{k.trend}</div>
          </div>
        ))}
      </div>

      {/* Prumo Progress */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <span style={{ fontWeight: 800, fontSize: 15, fontFamily: fnt, color: C.purple }}>Progresso Prumo 2027</span>
        </div>
        <p style={{ color: C.textSec, fontSize: 11, lineHeight: 1.5, marginBottom: 16 }}>
          Dataset mínimo necessário para treinar a IA proprietária. Cada app coleta dados que alimentam o modelo.
          Similar ao Tesla Autopilot — coleta anos de dados reais antes de treinar.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {PRUMO_PROGRESS.map(p => (
            <div key={p.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 11, fontFamily: fnt, color: C.text }}>{p.label}</span>
                <span style={{ fontSize: 9, fontFamily: fnt, color: C.textMuted }}>{p.current} / {p.target}</span>
              </div>
              <div style={{ height: 6, background: `${C.border}`, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.max(p.pct, 1)}%`,
                  background: p.color, borderRadius: 3,
                  transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ textAlign: 'right', marginTop: 2, fontSize: 9, fontFamily: fnt, color: p.color, fontWeight: 700 }}>{p.pct}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>🗺️</span>
          <span style={{ fontWeight: 800, fontSize: 15, fontFamily: fnt, color: C.amberDark }}>Roadmap</span>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {TIMELINE.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 12px', background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 10, fontFamily: fnt, color: C.amberDark, minWidth: 70, flexShrink: 0 }}>{t.date}</span>
              <span style={{ fontSize: 11, color: C.textSec, lineHeight: 1.4 }}>{t.event}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hourglass Model */}
      <div style={{ marginBottom: 28, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 800, fontSize: 14, fontFamily: fnt, color: C.dark }}>⏳ Modelo Ampulheta</span>
        </div>
        <div style={{ display: 'grid', gap: 8, fontSize: 11, color: C.textSec, lineHeight: 1.5 }}>
          <div style={{ background: `${C.cyan}08`, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.cyan}20` }}>
            <strong style={{ color: C.cyan, fontFamily: fnt, fontSize: 10 }}>COLETA (topo)</strong>
            <p style={{ margin: '4px 0 0' }}>11 apps especializados coletando dados reais: horas, fotos, cálculos, pagamentos, materiais, inspeções.</p>
          </div>
          <div style={{ textAlign: 'center', fontSize: 16 }}>▼</div>
          <div style={{ background: C.supabaseBg, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.supabase}20` }}>
            <strong style={{ color: C.supabase, fontFamily: fnt, fontSize: 10 }}>CENTRALIZAÇÃO (gargalo)</strong>
            <p style={{ margin: '4px 0 0' }}>Supabase PostgreSQL unificado. 40+ tables, RLS, multi-tenant. Todos os apps no mesmo banco.</p>
          </div>
          <div style={{ textAlign: 'center', fontSize: 16 }}>▼</div>
          <div style={{ background: `${C.purple}08`, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.purple}20` }}>
            <strong style={{ color: C.purple, fontFamily: fnt, fontSize: 10 }}>INTELIGÊNCIA (base)</strong>
            <p style={{ margin: '4px 0 0' }}>Prumo AI, Analytics, Predictor, Safety AI, Insurance API, Benchmark, White Label. Data moat impossível de copiar.</p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div style={{
        background: `${C.supabase}08`, border: `1px solid ${C.supabase}30`,
        borderRadius: 10, padding: 16, textAlign: 'center',
      }}>
        <div style={{ color: C.supabase, fontWeight: 700, fontSize: 12, fontFamily: fnt, marginBottom: 4 }}>
          ⚡ STATUS DO BANCO
        </div>
        <p style={{ color: C.textMuted, fontSize: 10, fontFamily: fnt, margin: 0 }}>
          Conecte o Supabase via .env.local para ver métricas reais em tempo real.
          <br />Os dados acima são placeholders demonstrativos.
        </p>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 28, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <a href="/" style={{ color: C.amberDark, fontSize: 10, fontFamily: fnt, textDecoration: 'none' }}>
          ← Voltar pra Arquitetura
        </a>
      </div>
    </div>
  );
}
