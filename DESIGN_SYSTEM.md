# OnSite Club — Design System

> Reference implementation: **onsite-timekeeper** (v1.8.0)
> All apps in the OnSite ecosystem must follow these tokens, patterns, and rules.

---

## Philosophy

- **Warm, worker-first, minimal** — no corporate language, no surveillance framing
- **Amber-only accent** — one accent color across the entire system
- **90% warm neutrals / 10% amber** — amber is rare and intentional
- **Offline-first** — every screen must work without network

---

## Color Palette

### Neutrals (Structure — 90% of UI)

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#F5F5F4` | Page canvas, screen bg |
| `backgroundSecondary` | `#FFFFFF` | Cards, modals, sheets |
| `backgroundTertiary` | `#F5F5F4` | Inputs, muted sections |
| `surface` | `#FFFFFF` | Card background |
| `surfaceMuted` | `#F5F5F4` | Input fields, placeholders |
| `darkSurface` | `#2A2A2A` | Timer bars, total pills, high-contrast areas |
| `text` | `#1A1A1A` | Primary text |
| `textSecondary` | `#888884` | Labels, descriptions, meta |
| `textMuted` | `#888884` | Subtle text (alias) |
| `iconMuted` | `#B0AFA9` | Inactive icons, placeholders |
| `border` | `#D1D0CE` | Dividers, card borders |
| `borderLight` | `#E5E5E3` | Subtle borders, separators |
| `black` | `#1A1A1A` | Text alias |
| `white` | `#FFFFFF` | — |

### Brand Accent — Amber (10% of UI)

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#C58B1B` | Buttons, active states, highlights, icons |
| `primaryStrong` | `#A67516` | Darker amber (hover, emphasis) |
| `primaryPressed` | `#8F6513` | Pressed state |
| `primarySoft` | `#FFF3D6` | Soft amber tint background |
| `primaryLight` | `#FFF3D6` | Light amber tint |
| `primaryLine` | `#F2D28B` | Amber line/border |

### Feedback / States

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#16A34A` | Success feedback only |
| `successSoft` | `#D1FAE5` | Success background |
| `warning` | `#C58B1B` | Warnings (amber) |
| `warningSoft` | `#FFF3D6` | Warning background |
| `error` | `#DC2626` | Danger, destructive actions |
| `errorSoft` | `rgba(220,38,38,0.12)` | Error background |
| `info` | `#3B82F6` | Links, informational (rare) |

> **Rule:** Green (`#16A34A`) is ONLY for success icons/badges. NEVER use green as a primary UI color.

### Location Colors (maps, geofence circles)

```
#F6C343  Yellow (primary)
#3B82F6  Blue
#16A34A  Green
#8B5CF6  Purple
#EC4899  Pink
#06B6D4  Cyan
#F97316  Orange
#14B8A6  Teal
```

---

## Typography

| Style | Size | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| Screen title | 28px | 700 | `#1A1A1A` | Main heading per screen |
| Card title | 15px | 600 | `#1A1A1A` | Card headers, section names |
| Body | 15px | 400-500 | `#1A1A1A` | Default readable text |
| Label | 13px | 500 | `#888884` | Form labels, meta info |
| Section header | 11-12px | 600 | `#888884` | Uppercase group titles |
| Meta/Small | 12px | 400 | `#888884` | Timestamps, footnotes |
| Timer | 36px | 700 | `#1A1A1A` | Timer display (monospace feel) |
| Tab label | 11px | 500-600 | varies | Active: `#1A1A1A`, Inactive: `#9CA3AF` |

**Section headers:** uppercase, letter-spacing `0.5-0.8`, weight 600, `#888884`

---

## Spacing

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `xxl` | 48px |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 10px | Small chips, tags |
| `md` | 14px | Buttons, inputs, cards |
| `lg` | 18px | Large cards, panels |
| `xl` | 24px | Modals, sheets |
| `full` | 9999px | Circles, pills |

---

## Shadows

| Level | offset | opacity | radius | elevation (Android) |
|-------|--------|---------|--------|---------------------|
| `sm` | 0, 2 | 0.06 | 6 | 2 |
| `md` | 0, 4 | 0.08 | 10 | 3 |
| `lg` | 0, 6 | 0.10 | 14 | 4 |

Shadow color: `#1A1A1A` (warm, not pure black)

---

## Component Patterns

### Buttons

| Type | Background | Text | Border | Min Height | Radius |
|------|-----------|------|--------|------------|--------|
| Primary | `#C58B1B` | `#FFFFFF` | none | 52px | 14px |
| Secondary | `#FFFFFF` | `#888884` | `0.5px #D1D0CE` | 52px | 14px |
| Danger | `#DC2626` | `#FFFFFF` | none | 52px | 14px |
| Disabled | `#F5F5F4` | `#B0AFA9` | none | 52px | 14px |
| Text/Ghost | transparent | `#C58B1B` | none | 44px | — |

### Cards

```
background:    #FFFFFF
border:        0.5px solid #D1D0CE
border-radius: 14px
padding:       16px
shadow:        sm (optional)
```

Accent bar (left edge): 3px, `#C58B1B`

### Inputs

```
background:    #F5F5F4
border:        0.5px solid #D1D0CE
border-radius: 14px
padding:       12-14px horizontal, 12px vertical
font-size:     15px
color:         #1A1A1A
placeholder:   #B0AFA9
focus-border:  #C58B1B
```

### Tab Bar

```
background:    #FFFFFF
border-top:    0.5px solid #E5E5E3
height:        60px + safe area
```

- **Active tab:** text `#1A1A1A`, weight 600, 4px amber dot (`#C58B1B`) below label
- **Inactive tab:** text `#9CA3AF`, weight 500
- **Icon size:** system default (~24px)

### Switches / Toggles

```
track-off:     #D1D0CE
track-on:      #FFF3D6
thumb-off:     #FFFFFF
thumb-on:      #C58B1B
```

### Radio Buttons

```
outer-ring:       22px, 2px border, #D1D0CE
outer-selected:   2px border, #C58B1B
inner-dot:        12px, #C58B1B (only when selected)
label:            14px, weight 500, #1A1A1A (selected) / #888884 (unselected)
row-height:       ~42px (10px vertical padding)
```

### Modals / Bottom Sheets

```
overlay:       rgba(26, 26, 26, 0.6)
background:    #FFFFFF
border-radius: 24px (top corners for sheets, all corners for center modals)
padding:       20-24px
```

### Grouped Table View (iOS Settings style)

```
section-header:   11px, uppercase, weight 600, letter-spacing 0.5, #888884
                  padding: 24px top, 8px bottom, 20px horizontal

card:             #FFFFFF, border-radius 14px, 0.5px border #D1D0CE

row:              min-height 52px, padding 16px horizontal
                  icon: 20px, #C58B1B
                  text: 15px, weight 500, #1A1A1A
                  chevron: chevron-forward, 16px, #B0AFA9

separator:        0.5px, #E5E5E3, left-margin 52px (past icon)
```

### Badges

| Type | Background | Text |
|------|-----------|------|
| Active | `#C58B1B` | `#FFFFFF` |
| Success | `#16A34A` | `#FFFFFF` |
| Warning | `#C58B1B` | `#FFFFFF` |
| Error | `#DC2626` | `#FFFFFF` |
| Info | `#3B82F6` | `#FFFFFF` |

### Bar Charts

```
bar-filled:    #C58B1B (amber)
bar-empty:     #E5E5E3 (muted)
bar-today:     #A67516 (darker amber, highlight)
label:         11px, #888884
value:         12px, weight 600, #1A1A1A
```

### Dark Surface Elements (timer bars, total pills)

```
background:    #2A2A2A
text:          #FFFFFF
accent-text:   #C58B1B (timer value, highlights)
muted-text:    #9CA3AF
dot-active:    #C58B1B
dot-paused:    #D4A43A
```

---

## Screen Layout Patterns

### Greeting Header

```
"Good morning, [FirstName]"    [Avatar]
"Monday, March 17"

- greeting:  24px, weight 700, #1A1A1A
- date:      15px, weight 500, #888884
- avatar:    44px circle, #2A2A2A bg, white initials
```

### Section Labels

```
"WORK LOCATION"
- 12px, weight 600, letter-spacing 0.8, #888884, uppercase
- margin-bottom: 8px
```

### Pill Selectors (tappable)

```
background:    #FFFFFF
border:        0.5px solid #D1D0CE
border-radius: 14px
padding:       14px vertical, 16px horizontal
shadow:        sm
content:       icon/dot + text + chevron
```

---

## Overlay / Opacity Helpers

```typescript
// Create color with opacity
function withOpacity(color: string, opacity: number): string

// Common patterns:
withOpacity('#C58B1B', 0.15)  // Amber tint for selected cells
withOpacity('#C58B1B', 0.12)  // Map preview circle fill
withOpacity('#C58B1B', 0.4)   // Map preview circle stroke
withOpacity('#DC2626', 0.3)   // Danger border (subtle)
```

---

## Do's and Don'ts

### Do

- Use warm stone (`#F5F5F4`) as page background, never cold gray
- Use amber (`#C58B1B`) sparingly — only for primary actions, active indicators, and highlights
- Use `0.5px` borders (hairline) for cards and inputs
- Use `14px` border-radius for interactive elements (buttons, inputs, cards)
- Use `52px` minimum height for tappable buttons
- Use dark surface (`#2A2A2A`) for high-contrast info bars
- Write user-first language: "Your hours", "Save Hours", not corporate jargon
- Use section headers: uppercase, 11px, weight 600, `#888884`

### Don't

- Use green as primary UI color (green is ONLY for success badges/feedback)
- Use cold grays (`#F6F7F9`, `#667085`, `#E3E7EE`) — always warm neutrals
- Use `1px` borders — prefer `0.5px` for a lighter feel
- Use shadows on everything — shadows are optional and subtle
- Write surveillance language: "tracked", "monitored", "employer" — say "recorded", "logged", "your data"
- Use more than one accent color — amber only
- Add emojis to UI unless explicitly requested

---

## Reference Implementation

The canonical implementation lives in:

```
onsite-timekeeper/src/constants/colors.ts    — All color tokens
onsite-timekeeper/src/constants/colors.ts    — Spacing, radius, shadow, typography tokens
onsite-timekeeper/app/(tabs)/_layout.tsx     — Tab bar with amber dot pattern
onsite-timekeeper/app/(tabs)/reports.tsx     — Log screen (form, pickers, timer)
onsite-timekeeper/app/(tabs)/history.tsx     — History screen (calendar, chart, export)
onsite-timekeeper/app/(tabs)/settings.tsx    — More screen (grouped table view)
onsite-timekeeper/app/(tabs)/map.tsx         — Locations screen (map, radio buttons)
```

When building a new OnSite app, copy `colors.ts` as starting point and adapt component-specific tokens as needed. The core palette (neutrals + amber + feedback) must remain identical across all apps.

---

*Last updated: 2026-03-17 — v1.8.0*
