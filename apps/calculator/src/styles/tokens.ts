/**
 * OnSite Calculator · Design Tokens v2
 *
 * TODO(post-Calculator-v2): promover este arquivo para
 *   `packages/tokens/themes/pressure-plate.ts`
 * e consumi-lo a partir do monorepo via `@onsite/tokens/pressure-plate`.
 * Isso é a "rota c" discutida no refactor plan — compartilhamento com outros
 * apps do ecossistema que quiserem a mesma linguagem visual. NÃO fazer agora:
 * antes precisa ter certeza de que o design se sustenta em produção, e
 * migrar `@onsite/tokens` pra suportar themes nomeados adiciona fricção em
 * Timekeeper/Operator que já estão shipped.
 *
 * Sistema de design baseado em "pressure plate" — superfícies côncavas
 * que simulam botões físicos de instrumento técnico (HP calculator, Bosch laser,
 * paquímetro Mitutoyo). Coerência tátil em todo o app.
 *
 * Três comportamentos possíveis pra qualquer elemento:
 * 1. ACIONA  → pressure plate elevado (botões, tabs ativas)
 * 2. RECEBE  → inset shadow rebaixado (input, transcrição, histórico inativo)
 * 3. EMERGE  → gradient radial sutil (cards de display, histórico ativo)
 *
 * Uso esperado:
 * - Importar no App.tsx como fonte única de verdade visual
 * - CSS vars são geradas a partir daqui (ver scripts/generate-css-vars.ts)
 * - Componentes usam tokens tipados, não strings hardcoded
 *
 * @author OnSite Club · Cris Rocha
 * @version 2.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════
// COLOR — Sistema cromático
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Paleta base. Tons quentes (bege/charcoal) em vez de cinzas neutros —
 * dá sensação de "mesa de trabalho", não "app de celular".
 */
export const color = {
  // Superfícies (fundos e cards)
  surface: {
    canvas:      '#F4F2EC',  // fundo geral do app — bege quente quase imperceptível
    canvasWarm:  '#EFECE3',  // sidebar e área rebaixada
    cardTop:     '#FFFFFF',  // topo do gradiente de card
    cardBottom:  '#FBF9F3',  // base do gradiente de card
    keyTop:      '#FFFFFF',  // topo do gradiente de keycap (pressure plate)
    keyMid:      '#F0EEE6',  // meio do gradiente
    keyBottom:   '#E3E0D3',  // base do gradiente (sombra suave)
    keyPressedTop:    '#ECEAE1',  // estado :active
    keyPressedBottom: '#E3E0D3',
    inset:       '#EFECE3',  // campos rebaixados (input, transcript)
    histItem:    '#FAF8F2',  // item de histórico inativo
    histHover:   '#FFFDF6',
    histActive:  '#FFF8E7',  // item ativo com gradient amber sutil
  },

  // Charcoal — fundo da tela de gravação e equals
  charcoal: {
    top:    '#2E3440',  // topo do gradiente radial
    mid:    '#242931',  // meio — cor dominante da tela de voz
    bottom: '#1A1F2C',  // base — adjacente ao equals e avatar
    darker: '#0F1419',  // uso raríssimo, só em borders extremos
    avatar: {
      top:    '#3A4252',
      bottom: '#1A1F2C',
    },
  },

  // Texto
  text: {
    primary:    '#0F1419',  // títulos, números grandes, resultado
    strong:     '#1F2937',  // números de teclado, corpo
    secondary:  '#6B7280',  // labels, subtexto, operadores
    tertiary:   '#9CA3AF',  // hints, timestamps, "você disse"
    inverse:    '#FFFFFF',  // em fundo escuro
    onCharcoal: '#FAC775',  // amber suave em fundo escuro (equals, acento)
  },

  // Brand OnSite — usado com RESTRIÇÃO máxima
  brand: {
    amber:       '#F5A623',  // accent primário — logo, microfone em gravação, border-left ativo
    amberLight:  '#F8C168',  // topo do gradient do botão de gravação ativo
    amberDark:   '#D4860F',  // base do gradient + hover
    amberGlow:   'rgba(245, 166, 35, 0.4)',  // box-shadow do botão gravando
  },

  // Semântico — feedback de operação
  semantic: {
    area:  { bg: '#E1F5EE', text: '#0F6E56', border: '#5DCAA5' },  // verde — área/volume
    length:{ bg: '#E6F1FB', text: '#0C447C', border: '#85B7EB' },  // azul — comprimento
    count: { bg: '#F1EFE8', text: '#444441', border: '#B4B2A9' },  // cinza — contagem/escalar
    danger:{ bg: '#FCEBEB', text: '#B91C1C', border: '#F09595' },  // vermelho — C e backspace
    warn:  { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27' },  // amber — validação
  },

  // Bordas e divisores (sempre com alpha)
  border: {
    subtle:  'rgba(15, 20, 25, 0.04)',
    faint:   'rgba(15, 20, 25, 0.06)',
    soft:    'rgba(15, 20, 25, 0.08)',
    medium:  'rgba(15, 20, 25, 0.12)',
    strong:  'rgba(15, 20, 25, 0.2)',
    highlightTop:    'rgba(255, 255, 255, 0.9)',  // highlight interno nas superfícies elevadas
    highlightSoft:   'rgba(255, 255, 255, 0.5)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// GRADIENT — Gradientes reutilizáveis
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gradientes nomeados. Radial ellipse é a assinatura do pressure plate —
 * simula luz caindo de cima no centro, escurecendo nas bordas (concavidade).
 */
export const gradient = {
  // Pressure plate keycap (botão número padrão)
  keyRest:    `radial-gradient(ellipse at center top, ${color.surface.keyTop} 0%, ${color.surface.keyMid} 60%, ${color.surface.keyBottom} 100%)`,
  keyHover:   `radial-gradient(ellipse at center top, ${color.surface.keyTop} 0%, #F5F3EB 60%, #EBE8DA 100%)`,
  keyPressed: `radial-gradient(ellipse at center top, ${color.surface.keyPressedTop} 0%, ${color.surface.keyPressedBottom} 100%)`,

  // Keycap equals (dark)
  keyDark:    `radial-gradient(ellipse at center top, #2F3744 0%, ${color.charcoal.bottom} 60%, ${color.charcoal.darker} 100%)`,

  // Card elevado (display, histórico)
  cardRest:   `radial-gradient(ellipse at center top, ${color.surface.cardTop} 0%, ${color.surface.cardBottom} 100%)`,

  // Header branco com base levemente quente
  header:     `radial-gradient(ellipse at center top, ${color.surface.cardTop} 0%, #F8F6F0 100%)`,

  // Avatar circular
  avatar:     `radial-gradient(ellipse at center top, ${color.charcoal.avatar.top} 0%, ${color.charcoal.avatar.bottom} 100%)`,

  // Tela de gravação
  darkScreen: `radial-gradient(ellipse at top, ${color.charcoal.top} 0%, ${color.charcoal.mid} 50%, ${color.charcoal.bottom} 100%)`,

  // Botão de gravação ativo (amber)
  voiceActive:`radial-gradient(ellipse at center top, ${color.brand.amberLight} 0%, ${color.brand.amber} 60%, ${color.brand.amberDark} 100%)`,

  // Item de histórico ativo (sutilíssimo amber)
  histActive: `radial-gradient(ellipse at left center, ${color.surface.histActive} 0%, #FDF4D9 100%)`,

  // Mini botão (copiar/editar/etc)
  miniKey:    `radial-gradient(ellipse at center top, ${color.surface.cardTop} 0%, #F4F2EA 100%)`,
  miniKeyHover: `radial-gradient(ellipse at center top, ${color.surface.cardTop} 0%, #F8F6EE 100%)`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SHADOW — Sistema de sombras
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Três famílias de sombra:
 *
 * - `elevated` → eleva da superfície (botão não pressionado)
 * - `inset`    → afunda na superfície (input, transcrição)
 * - `pressed`  → estado :active (botão apertado)
 *
 * Todas combinam: highlight interno no topo + shadow interno na base + drop shadow.
 * Essa combinação tripla é o que dá a ilusão de concavidade real.
 */
export const shadow = {
  // Pressure plate keycap (rest)
  key: [
    'inset 0 1px 0 rgba(255, 255, 255, 0.95)',      // highlight topo
    'inset 0 -2px 4px rgba(15, 20, 25, 0.05)',      // shadow interno base
    '0 1px 2px rgba(15, 20, 25, 0.04)',             // drop shadow externo
  ].join(', '),

  // Pressure plate keycap (pressed)
  keyPressed: [
    'inset 0 2px 4px rgba(15, 20, 25, 0.08)',       // shadow interno topo (invertido)
    '0 0 0 rgba(0, 0, 0, 0)',                        // zera drop shadow
  ].join(', '),

  // Keycap escuro (equals)
  keyDark: [
    'inset 0 1px 0 rgba(255, 255, 255, 0.08)',      // highlight muito sutil
    'inset 0 -2px 4px rgba(0, 0, 0, 0.3)',          // shadow base pronunciada
    '0 1px 2px rgba(15, 20, 25, 0.2)',              // drop shadow mais forte
  ].join(', '),

  // Card elevado (display, histórico)
  card: [
    'inset 0 1px 0 rgba(255, 255, 255, 0.9)',       // highlight topo
    '0 1px 2px rgba(15, 20, 25, 0.04)',             // drop shadow sutil
  ].join(', '),

  // Campo rebaixado (input, transcrição)
  inset: [
    'inset 0 2px 4px rgba(15, 20, 25, 0.06)',       // shadow interno topo (afunda)
    'inset 0 -1px 0 rgba(255, 255, 255, 0.5)',      // highlight interno base
  ].join(', '),

  // Badge esmaltado (● Área)
  badge: [
    'inset 0 1px 2px rgba(15, 110, 86, 0.1)',       // cor da semântica
    'inset 0 -1px 0 rgba(255, 255, 255, 0.4)',
  ].join(', '),

  // Item de histórico inativo
  histItem: [
    'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
    'inset 0 -1px 1px rgba(15, 20, 25, 0.02)',
  ].join(', '),

  // Item de histórico ativo (com border-left amber)
  histActive: [
    `inset 2px 0 0 ${color.brand.amber}`,            // border-left accent
    'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  ].join(', '),

  // Mini pressure plate (botões de ação: copiar, editar, etc)
  miniKey: [
    'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
    'inset 0 -1px 2px rgba(15, 20, 25, 0.04)',
    '0 1px 1px rgba(15, 20, 25, 0.03)',
  ].join(', '),

  miniKeyPressed: 'inset 0 2px 3px rgba(15, 20, 25, 0.06)',

  // Avatar
  avatar: [
    'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    '0 1px 2px rgba(15, 20, 25, 0.1)',
  ].join(', '),

  // Botão de voz ativo (amber com glow)
  voiceActive: [
    'inset 0 1px 0 rgba(255, 255, 255, 0.4)',
    'inset 0 -2px 4px rgba(0, 0, 0, 0.15)',
    `0 4px 20px ${color.brand.amberGlow}`,
  ].join(', '),

  // Transcript area (rebaixado na tela escura)
  transcriptInset: [
    'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
    'inset 0 -1px 0 rgba(255, 255, 255, 0.04)',
  ].join(', '),

  // Ring de foco (acessibilidade)
  focusRing: `0 0 0 3px ${color.brand.amber}33`,  // 33 = 20% alpha em hex
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// RADIUS — Raios de borda
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Escala consistente. Keycaps têm radius próprio (10px) porque é a proporção
 * exata que simula moldagem de plástico sem parecer nem quadrado nem pill.
 */
export const radius = {
  xs:   '4px',   // badges, tags pequenas
  sm:   '6px',   // mini botões, tabs, inputs internos
  md:   '8px',   // campos, botões médios
  key: '10px',   // ← keycap padrão (assinatura do sistema)
  lg:  '12px',   // cards, containers
  xl:  '14px',   // cards principais (display grande)
  '2xl':'16px',  // app shell
  full:'9999px', // círculos (avatar, voz compacto)
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TRANSITION — Animações
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Timing das transições. A curva `bounceDown` é o que vende o pressure plate —
 * é uma cubic-bezier que desacelera com leve overshoot no final, simulando
 * o "assentamento" de um botão físico depois de solto.
 */
export const transition = {
  instant: '60ms linear',
  fast:    '100ms ease',
  base:    '120ms cubic-bezier(0.34, 1.2, 0.64, 1)',    // ← assinatura, bounce sutil
  smooth:  '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow:    '300ms cubic-bezier(0.4, 0, 0.2, 1)',

  // Curvas nomeadas pra usar em casos específicos
  bezier: {
    bounceDown: 'cubic-bezier(0.34, 1.2, 0.64, 1)',   // pressure plate
    spring:     'cubic-bezier(0.34, 1.56, 0.64, 1)',  // mais pronunciado (modais)
    standard:   'cubic-bezier(0.4, 0, 0.2, 1)',       // material design default
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',         // entrada
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',         // saída
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY — Escala tipográfica
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Duas famílias só. Geist pra UI e texto. JetBrains Mono pra expressões
 * matemáticas (alinhamento de colunas importa em fração e medida imperial).
 * Carregar via @fontsource no index.css, não via Google Fonts CDN.
 */
export const typography = {
  family: {
    sans: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
  },

  weight: {
    regular: 400,
    medium:  500,      // máximo — nunca use 600 ou 700
  },

  // Escala compacta. Números são tamanho em px.
  size: {
    micro: 9,    // timestamps, hints minúsculos mobile
    tiny:  10,   // labels uppercase, "você disse"
    xs:    11,   // mono expressions (histórico), metadados
    sm:    12,   // labels secundários, captions
    base:  13,   // texto padrão mobile / secundário desktop
    md:    14,   // texto padrão desktop, botões de ação
    lg:    16,   // números no teclado principal
    xl:    18,   // logo header, tipografia matemática importante
    '2xl': 20,   // operadores (×, ÷)
    '3xl': 24,   // unidade no display (sq ft)
    '4xl': 30,   // display mobile
    '5xl': 40,   // display tablet
    '6xl': 46,   // display desktop
    '7xl': 48,   // display desktop extra-grande (opcional)
  },

  // Altura de linha. Tighter pra display grande, relaxed pra corpo.
  lineHeight: {
    tight:   1.1,   // display grandes
    snug:    1.3,   // transcrição, subtítulos
    normal:  1.4,   // corpo secundário
    relaxed: 1.5,   // corpo principal
  },

  // Letter spacing. Negativo em displays grandes (padrão fintech moderno).
  tracking: {
    displayTight:  '-1.5px',  // 48px+
    displayNormal: '-1.2px',  // 30-46px
    displaySnug:   '-0.8px',  // 24-30px
    headingTight:  '-0.3px',  // logo, títulos
    normal:        '0',
    wide:          '0.5px',   // labels pequenos
    uppercase:     '0.8px',   // labels UPPERCASE
    widest:        '1.2px',   // texto indicador (OUVINDO EM PT)
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SPACING — Espaçamento
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Escala base 4px. Use step semântico (card-padding, key-gap) quando
 * fizer sentido, valor numérico (2, 4, 6...) quando não.
 */
export const spacing = {
  0:  '0',
  1:  '4px',
  2:  '6px',
  3:  '8px',
  4:  '10px',
  5:  '12px',
  6:  '14px',
  7:  '16px',
  8:  '18px',
  9:  '20px',
  10: '24px',
  11: '28px',
  12: '32px',

  // Semânticos
  keyGap:       '5px',    // entre keycaps do keypad
  keyGapMobile: '4px',
  cardPadding:  '14px',
  cardPaddingLg:'18px',
  sectionGap:   '20px',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// BREAKPOINTS — Responsividade
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Três breakpoints. Mobile é padrão (mobile-first), tablet é ponto de
 * reorganização principal, desktop é quando o three-column entra.
 */
export const breakpoint = {
  mobile:  '0px',       // 0-639 — single column, teclado fullwidth
  tablet:  '640px',     // 640-1023 — single column, display + teclado expandido
  desktop: '1024px',    // 1024+ — three-column (histórico | display | teclado)

  // Media queries prontas pra usar
  mq: {
    tablet:  '@media (min-width: 640px)',
    desktop: '@media (min-width: 1024px)',
    mobileOnly: '@media (max-width: 639px)',
    tabletOnly: '@media (min-width: 640px) and (max-width: 1023px)',
    reducedMotion: '@media (prefers-reduced-motion: reduce)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Z-INDEX — Camadas
// ═══════════════════════════════════════════════════════════════════════════

export const zIndex = {
  base:      0,
  raised:    10,
  dropdown:  100,
  sticky:    200,
  overlay:   1000,    // modal overlay background
  modal:     1100,    // modal content
  toast:     1200,    // notificações
  voiceOverlay: 1300, // tela de gravação fullscreen (mobile)
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT PRESETS — Composição pronta pros componentes principais
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Presets compostos. Use quando quiser garantir coerência total num
 * componente específico sem ter que remontar cor + shadow + radius + transition
 * toda vez. Importe assim:
 *
 *   import { preset } from '@/styles/tokens';
 *   <button css={preset.keyRest}>7</button>
 */
export const preset = {
  keyRest: {
    background:    gradient.keyRest,
    borderRadius:  radius.key,
    boxShadow:     shadow.key,
    transition:    `all ${transition.base}`,
    color:         color.text.strong,
    fontFamily:    typography.family.mono,
    fontWeight:    typography.weight.medium,
    cursor:        'pointer',
  },

  keyHover: {
    background: gradient.keyHover,
  },

  keyPressed: {
    background: gradient.keyPressed,
    boxShadow:  shadow.keyPressed,
    transform:  'translateY(0.5px)',
  },

  keyEquals: {
    background:    gradient.keyDark,
    color:         color.text.onCharcoal,
    boxShadow:     shadow.keyDark,
    borderRadius:  radius.key,
    transition:    `all ${transition.base}`,
    fontFamily:    typography.family.mono,
    fontWeight:    typography.weight.medium,
    cursor:        'pointer',
  },

  cardElevated: {
    background:    gradient.cardRest,
    borderRadius:  radius.lg,
    boxShadow:     shadow.card,
    padding:       spacing.cardPadding,
  },

  inputInset: {
    background:    color.surface.inset,
    borderRadius:  radius.md,
    boxShadow:     shadow.inset,
    padding:       `${spacing[4]} ${spacing[6]}`,
  },

  miniButton: {
    background:    gradient.miniKey,
    borderRadius:  radius.sm,
    boxShadow:     shadow.miniKey,
    padding:       `${spacing[1]} ${spacing[5]}`,
    fontSize:      `${typography.size.xs}px`,
    fontFamily:    typography.family.sans,
    fontWeight:    typography.weight.regular,
    color:         color.text.strong,
    cursor:        'pointer',
    transition:    `all ${transition.fast}`,
  },

  badgeArea:  {
    display:       'inline-block',
    background:    color.semantic.area.bg,
    color:         color.semantic.area.text,
    fontSize:      `${typography.size.tiny}px`,
    textTransform: 'uppercase' as const,
    letterSpacing: typography.tracking.uppercase,
    fontWeight:    typography.weight.medium,
    padding:       `3px 9px`,
    borderRadius:  radius.xs,
    boxShadow:     shadow.badge,
  },

  avatar: {
    width:         '30px',
    height:        '30px',
    borderRadius:  radius.full,
    background:    gradient.avatar,
    color:         color.text.inverse,
    boxShadow:     shadow.avatar,
    display:       'flex',
    alignItems:    'center' as const,
    justifyContent:'center' as const,
    fontSize:      `${typography.size.xs}px`,
    fontWeight:    typography.weight.medium,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CSS VARIABLES — Export pra :root
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera CSS custom properties a partir dos tokens. Injete no <head> uma vez
 * e use `var(--color-surface-canvas)` em qualquer CSS/styled-component.
 *
 * Uso:
 *   import { cssVars } from '@/styles/tokens';
 *   const css = `:root { ${cssVars} }`;
 */
export const cssVars = `
  /* Surfaces */
  --color-surface-canvas: ${color.surface.canvas};
  --color-surface-canvas-warm: ${color.surface.canvasWarm};
  --color-surface-card-top: ${color.surface.cardTop};
  --color-surface-card-bottom: ${color.surface.cardBottom};
  --color-surface-key-top: ${color.surface.keyTop};
  --color-surface-key-mid: ${color.surface.keyMid};
  --color-surface-key-bottom: ${color.surface.keyBottom};
  --color-surface-inset: ${color.surface.inset};

  /* Text */
  --color-text-primary: ${color.text.primary};
  --color-text-strong: ${color.text.strong};
  --color-text-secondary: ${color.text.secondary};
  --color-text-tertiary: ${color.text.tertiary};
  --color-text-inverse: ${color.text.inverse};
  --color-text-on-charcoal: ${color.text.onCharcoal};

  /* Brand */
  --color-brand-amber: ${color.brand.amber};
  --color-brand-amber-light: ${color.brand.amberLight};
  --color-brand-amber-dark: ${color.brand.amberDark};
  --color-brand-amber-glow: ${color.brand.amberGlow};

  /* Charcoal */
  --color-charcoal-top: ${color.charcoal.top};
  --color-charcoal-mid: ${color.charcoal.mid};
  --color-charcoal-bottom: ${color.charcoal.bottom};

  /* Semantic */
  --color-semantic-area-bg: ${color.semantic.area.bg};
  --color-semantic-area-text: ${color.semantic.area.text};
  --color-semantic-area-border: ${color.semantic.area.border};
  --color-semantic-length-bg: ${color.semantic.length.bg};
  --color-semantic-length-text: ${color.semantic.length.text};
  --color-semantic-length-border: ${color.semantic.length.border};
  --color-semantic-count-bg: ${color.semantic.count.bg};
  --color-semantic-count-text: ${color.semantic.count.text};
  --color-semantic-count-border: ${color.semantic.count.border};
  --color-semantic-danger-bg: ${color.semantic.danger.bg};
  --color-semantic-danger-text: ${color.semantic.danger.text};
  --color-semantic-danger-border: ${color.semantic.danger.border};
  --color-semantic-warn-bg: ${color.semantic.warn.bg};
  --color-semantic-warn-text: ${color.semantic.warn.text};
  --color-semantic-warn-border: ${color.semantic.warn.border};

  /* Borders */
  --color-border-subtle: ${color.border.subtle};
  --color-border-faint: ${color.border.faint};
  --color-border-soft: ${color.border.soft};
  --color-border-medium: ${color.border.medium};
  --color-border-strong: ${color.border.strong};

  /* Gradients */
  --gradient-key-rest: ${gradient.keyRest};
  --gradient-key-pressed: ${gradient.keyPressed};
  --gradient-key-dark: ${gradient.keyDark};
  --gradient-card: ${gradient.cardRest};
  --gradient-dark-screen: ${gradient.darkScreen};
  --gradient-voice-active: ${gradient.voiceActive};
  --gradient-avatar: ${gradient.avatar};

  /* Shadows */
  --shadow-key: ${shadow.key};
  --shadow-key-pressed: ${shadow.keyPressed};
  --shadow-key-dark: ${shadow.keyDark};
  --shadow-card: ${shadow.card};
  --shadow-inset: ${shadow.inset};
  --shadow-mini-key: ${shadow.miniKey};
  --shadow-avatar: ${shadow.avatar};
  --shadow-voice-active: ${shadow.voiceActive};
  --shadow-focus-ring: ${shadow.focusRing};

  /* Radius */
  --radius-xs: ${radius.xs};
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-key: ${radius.key};
  --radius-lg: ${radius.lg};
  --radius-xl: ${radius.xl};
  --radius-full: ${radius.full};

  /* Transitions */
  --transition-fast: ${transition.fast};
  --transition-base: ${transition.base};
  --transition-smooth: ${transition.smooth};

  /* Typography */
  --font-sans: ${typography.family.sans};
  --font-mono: ${typography.family.mono};

  /* Spacing (semantic) */
  --spacing-key-gap: ${spacing.keyGap};
  --spacing-key-gap-mobile: ${spacing.keyGapMobile};
  --spacing-card-padding: ${spacing.cardPadding};
  --spacing-card-padding-lg: ${spacing.cardPaddingLg};
  --spacing-section-gap: ${spacing.sectionGap};
`.trim();

// ═══════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS — Pra uso em componentes tipados
// ═══════════════════════════════════════════════════════════════════════════

export type Color = typeof color;
export type Gradient = typeof gradient;
export type Shadow = typeof shadow;
export type Radius = typeof radius;
export type Transition = typeof transition;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Breakpoint = typeof breakpoint;
export type Preset = typeof preset;

// Export agrupado (alternativa a imports nomeados)
export const tokens = {
  color,
  gradient,
  shadow,
  radius,
  transition,
  typography,
  spacing,
  breakpoint,
  zIndex,
  preset,
  cssVars,
} as const;

export default tokens;
